import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock chrome API
const chromeMock = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({ settings: {} }),
      set: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
        addListener: vi.fn(),
    }
  },
  runtime: {
      sendMessage: vi.fn(),
  }
};

vi.stubGlobal('chrome', chromeMock);

describe('Options Page', () => {
  beforeEach(async () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <form id="settingsForm">
          <select id="provider"><option value="openrouter">OpenRouter</option></select>
          <div class="input-wrapper">
             <input type="password" id="apiKey" />
             <!-- Button will be added here by the implementation -->
             <button type="button" class="toggle-password-btn" id="toggleApiKeyVisibility"></button>
          </div>
          <input id="apiEndpoint" />
          <select id="model"></select>
          <button id="addModelBtn"></button>
          <button id="deleteModelBtn"></button>
          <input id="maxTokens" />
          <select id="toastPosition"></select>
          <input id="toastDuration" />
          <input type="checkbox" id="toastIndefinite" />
          <button id="testBtn"></button>
          <div id="status"></div>
          <div id="endpointGroup"></div>
          <input type="radio" name="promptMode" value="auto">
          <input type="radio" name="promptMode" value="manual">
          <input type="radio" name="promptMode" value="custom">
          <div id="customPromptContainer"></div>
          <textarea id="customPrompt"></textarea>
          <input type="checkbox" id="discreteMode" />
          <div id="opacityGroup"></div>
          <input id="discreteModeOpacity" />
          <span id="opacityValue"></span>
        </form>
      </body>
      </html>
    `);

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
    vi.stubGlobal('HTMLInputElement', dom.window.HTMLInputElement);
    vi.stubGlobal('HTMLFormElement', dom.window.HTMLFormElement);
    vi.stubGlobal('HTMLSelectElement', dom.window.HTMLSelectElement);
    vi.stubGlobal('HTMLButtonElement', dom.window.HTMLButtonElement);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);
    vi.stubGlobal('HTMLTextAreaElement', dom.window.HTMLTextAreaElement);
    vi.stubGlobal('HTMLSpanElement', dom.window.HTMLSpanElement);

    // Reset mocks
    chrome.storage.local.get.mockResolvedValue({ settings: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should toggle password visibility when button is clicked', async () => {
    // Import the options script to attach event listeners
    await import('./options.ts?v=' + Date.now());

    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.querySelector('.toggle-password-btn') as HTMLButtonElement;

    expect(apiKeyInput.type).toBe('password');

    // Simulate click
    // Note: Since we are adding the listener in options.ts, we expect this to work
    // However, since we haven't implemented it yet, this test might fail or just do nothing if the button exists but no listener
    // Or fail if button doesn't exist (if I didn't add it in the DOM mock above)
    // I added it in the DOM mock above so we can test the logic once implemented.

    // But wait, the DOM mock above has the button, but the real options.html doesn't yet.
    // And options.ts doesn't select it yet.

    // So current options.ts won't attach the listener.
    // So dispatching click won't change the type.

    toggleBtn.dispatchEvent(new window.Event('click'));

    expect(apiKeyInput.type).toBe('text');

    toggleBtn.dispatchEvent(new window.Event('click'));

    expect(apiKeyInput.type).toBe('password');
  });
});
