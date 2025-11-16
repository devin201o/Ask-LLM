import { DEFAULT_SETTINGS } from './types';
import type { ExtensionSettings, LLMResponse } from './types';

const CONTEXT_MENU_ID = 'ask-llm';

// --- INITIALIZATION ---
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('settings');
  if (!result.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  await updateContextMenu();
});

// --- LISTENERS ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_CHANGED') {
    updateContextMenu();
    sendResponse({ success: true });
    return;
  }

  if (message.type === 'EXECUTE_MANUAL_PROMPT') {
    (async () => {
      const { selectionText, prompt } = message.payload;
      const tabId = sender.tab?.id;
      if (tabId) {
        await processLLMRequest(selectionText, tabId, prompt);
      }
    })();
    sendResponse({ success: true });
    return true; // Indicate async response
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const isPdf = tab?.url?.toLowerCase().endsWith('.pdf');

  if (isPdf && !info.selectionText) {
    // Special handling for PDFs where direct selection is not possible
    await handlePdfInteraction(tab.id);
    return;
  }

  if (
    info.menuItemId !== CONTEXT_MENU_ID ||
    !info.selectionText ||
    !tab?.id ||
    !tab.url
  ) {
    return;
  }


  // Ensure the extension doesn't run on unsupported pages like chrome://
  if (!/^(https?|file):/.test(tab.url)) {
    return;
  }

  const { settings } = await chrome.storage.local.get('settings');
  const currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  if (!currentSettings.apiKey) {
    await ensureAndSendMessage(tab.id, {
      type: 'SHOW_TOAST',
      payload: { message: 'Please set your API key in the extension options.', type: 'error' },
    });
    return;
  }

  if (currentSettings.promptMode === 'manual') {
    await ensureAndSendMessage(tab.id, {
      type: 'SHOW_INPUT_BOX',
      payload: {
        selectionText: info.selectionText,
      },
    });
  } else {
    await processLLMRequest(info.selectionText, tab.id);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'run-ask-llm') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || !tab.url) {
      console.warn('Cannot run Ask LLM on a tab without ID or URL.', tab);
      return;
    }

    // Ensure the extension doesn't run on unsupported pages
    if (!/^(https?|file):/.test(tab.url)) {
      console.log(`Cannot run Ask LLM on an unsupported page: ${tab.url}`);
      return;
    }

    try {
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString(),
      });

      if (chrome.runtime.lastError) {
        console.error(`Error injecting script: ${chrome.runtime.lastError.message}`);
        return;
      }

      // We can get an empty result, which is fine.
      const selectionText = (injectionResults && injectionResults.length > 0 ? injectionResults[0].result : '') || '';

      const { settings } = await chrome.storage.local.get('settings');
      const currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

      if (!currentSettings.apiKey) {
         await ensureAndSendMessage(tab.id, {
           type: 'SHOW_TOAST',
           payload: { message: 'Please set your API key in the extension options.', type: 'error' },
         });
         return;
      }

      if (currentSettings.promptMode === 'manual') {
        // In manual mode, always show the input box, even if there's no selection.
        await ensureAndSendMessage(tab.id, {
          type: 'SHOW_INPUT_BOX',
          payload: { selectionText }, // selectionText can be ''
        });
      } else {
        // In other modes (auto, custom), require a text selection.
        if (selectionText) {
          await processLLMRequest(selectionText, tab.id);
        } else {
          await ensureAndSendMessage(tab.id, {
            type: 'SHOW_TOAST',
            payload: { message: 'No text selected.', type: 'info', duration: 2000 },
          });
        }
      }
    } catch (e) {
      console.error('Failed to execute script or process LLM request:', e);
       await ensureAndSendMessage(tab.id, {
         type: 'SHOW_TOAST',
         payload: { message: `An error occurred: ${String(e)}`, type: 'error' },
       });
    }
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.settings) {
    updateContextMenu();
  }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (typeof notificationId === 'string' && notificationId.startsWith('pdf-clipboard-notification-')) {
    const tabId = parseInt(notificationId.replace('pdf-clipboard-notification-', ''), 10);
    if (isNaN(tabId)) {
      return;
    }

    try {
      // We cannot use navigator.clipboard in the service worker,
      // so we inject a script into the tab to read the clipboard.
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => navigator.clipboard.readText(),
      });

      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }

      const clipboardText = injectionResults?.[0]?.result;

      if (clipboardText) {
        await processLLMRequest(clipboardText, tabId);
      } else {
        await ensureAndSendMessage(tabId, {
          type: 'SHOW_TOAST',
          payload: { message: 'Clipboard is empty or could not be read. Please copy some text first.', type: 'error' },
        });
      }
    } catch (error) {
      console.error('Failed to read from clipboard via injection:', error);
      await ensureAndSendMessage(tabId, {
        type: 'SHOW_TOAST',
        payload: { message: `Could not read from clipboard: ${String(error)}`, type: 'error' },
      });
    } finally {
        chrome.notifications.clear(notificationId);
    }
  }
});

async function handlePdfInteraction(tabId: number | undefined) {
  if (!tabId) return;

  const NOTIFICATION_ID = `pdf-clipboard-notification-${tabId}`;

  chrome.notifications.create(NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Ask LLM for PDFs',
    message: 'Please copy the text you want to ask about, then click this notification to proceed.',
    priority: 2,
    requireInteraction: true,
  });
}

// --- CORE LOGIC ---
async function processLLMRequest(text: string, tabId: number, manualPrompt?: string) {
  const { settings } = await chrome.storage.local.get('settings');
  const currentSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  const isReady = await ensureContentScript(tabId);
  if (!isReady) {
    showRefreshNotification(tabId);
    return;
  }

  await ensureAndSendMessage(tabId, {
    type: 'SHOW_TOAST',
    payload: { message: 'Asking LLM...', type: 'info', duration: 0 },
  });

  try {
    const response = await callLLM(text, currentSettings, manualPrompt);
    await ensureAndSendMessage(tabId, {
      type: 'SHOW_TOAST',
      payload: {
        message: response.content || 'No response received',
        type: response.success ? 'success' : 'error',
        duration: currentSettings.toastIndefinite ? -1 : currentSettings.toastDuration,
      },
    });
  } catch (error) {
    await ensureAndSendMessage(tabId, {
      type: 'SHOW_TOAST',
      payload: { message: String(error), type: 'error' },
    });
  }
}

import { DEFAULT_PROMPTS } from './prompts';

const MANUAL_MODE_PROMPT_APPENDIX = 'Please be concise, while still being clear and informative.';

async function callLLM(text: string, settings: ExtensionSettings, manualPrompt?: string): Promise<LLMResponse> {
  const { apiKey, apiEndpoint } = settings;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': chrome.runtime.getURL(''),
    'X-Title': 'Ask LLM Extension',
  };

  let systemPrompt: string;

  if (manualPrompt) {
    systemPrompt = `${manualPrompt} ${MANUAL_MODE_PROMPT_APPENDIX}`;
  } else if (settings.promptMode === 'custom') {
    systemPrompt = settings.customPrompt;
  } else {
    systemPrompt = DEFAULT_PROMPTS.conciseAcademic;
  }

  const requestBody = {
    model: settings.selectedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    max_tokens: settings.maxTokens,
  };

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || 'No response';

  return { success: true, content };
}

// --- HELPERS ---
async function updateContextMenu() {
  const { settings } = await chrome.storage.local.get('settings');
  const enabled = settings?.enabled ?? DEFAULT_SETTINGS.enabled;

  await chrome.contextMenus.removeAll();

  if (enabled) {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Ask LLM',
      contexts: ['selection'],
    });
  }
}

async function pingTab(tabId: number): Promise<boolean> {
  let timeout: NodeJS.Timeout;
  return new Promise((resolve) => {
    timeout = setTimeout(() => {
      console.log(`Ping timeout for tab ${tabId}`);
      resolve(false);
    }, 250);

    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        console.log(`Ping failed for tab ${tabId}:`, chrome.runtime.lastError.message);
        resolve(false);
      } else if (response?.type === 'PONG') {
        resolve(true);
      } else {
        console.warn(`Unexpected response to ping in tab ${tabId}:`, response);
        resolve(false);
      }
    });
  });
}

async function reinjectContentScript(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
    console.log(`Successfully reinjected content script into tab ${tabId}`);
    return await pingTab(tabId);
  } catch (error) {
    console.warn(`Failed to reinject content script into tab ${tabId}:`, error);
    return false;
  }
}

async function ensureContentScript(tabId: number): Promise<boolean> {
  const isAlive = await pingTab(tabId);
  if (isAlive) {
    return true;
  }
  console.log(`Content script in tab ${tabId} is not responding. Attempting to reinject.`);
  return await reinjectContentScript(tabId);
}

function showRefreshNotification(tabId: number) {
  chrome.notifications.create(`refresh-notification-${tabId || Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Ask LLM',
    message: 'The extension seems to be out of sync on this page. Please refresh the tab and try again.',
    priority: 2,
  });
}

export async function ensureAndSendMessage(tabId: number, message: any) {
  const isReady = await ensureContentScript(tabId);
  if (!isReady) {
    // If the script isn't ready, we can't show a toast. Show a system notification instead.
    showRefreshNotification(tabId);
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.warn(`sendMessage failed even after ensureContentScript for tab ${tabId}`, error);
    showRefreshNotification(tabId);
  }
}