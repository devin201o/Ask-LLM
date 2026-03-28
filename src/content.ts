import { getScaledDimensions, scaleRegionToImage } from './capture-utils';
import type {
  CaptureBounds,
  CaptureViewport,
  ImageAttachment,
  ShowInputBoxPayload,
  ToastOptions,
} from './types';

// --- STATE ---
let currentToast: HTMLDivElement | null = null;
let toastTimeout: number | null = null;
let copyTimeout: number | null = null;
let currentInputBox: HTMLDivElement | null = null;
let currentCaptureOverlay: HTMLDivElement | null = null;

// --- EVENT LISTENERS ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_TOAST') {
    (async () => {
      await showToast(message.payload);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === 'SHOW_INPUT_BOX') {
    showInputBox(message.payload);
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'START_REGION_SELECTION') {
    showRegionSelector();
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return false; // Not async
  }

  sendResponse({ success: true });
  return false;
});

// --- INPUT BOX IMPLEMENTATION ---

function showInputBox(payload: string | ShowInputBoxPayload) {
  dismissInputBox(); // Ensure no other box is open

  const { selectionText, imageAttachment } = typeof payload === 'string'
    ? { selectionText: payload, imageAttachment: undefined }
    : payload;

  const container = document.createElement('div');
  container.id = 'ask-llm-input-container';
  document.body.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles/input-box.css');
  shadowRoot.appendChild(styleLink);

  const inputBox = document.createElement('div');
  inputBox.className = 'ask-llm-input-box-container';

  const header = document.createElement('div');
  header.className = 'input-box-header';
  header.textContent = imageAttachment ? 'Prompt with captured image' : 'Prompt';

  const input = document.createElement('textarea');
  input.rows = imageAttachment ? 3 : 2;
  input.placeholder = 'Your prompt... (Press Ctrl+Enter to submit)';

  let pendingImage = imageAttachment;

  if (pendingImage) {
    const preview = document.createElement('div');
    preview.className = 'capture-preview';

    const previewImage = document.createElement('img');
    previewImage.src = pendingImage.dataUrl;
    previewImage.alt = 'Captured region preview';

    const previewMeta = document.createElement('div');
    previewMeta.className = 'capture-preview-meta';
    previewMeta.textContent = `${pendingImage.width}×${pendingImage.height} captured region`;

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'capture-clear-btn';
    clearButton.textContent = 'Remove image';
    clearButton.addEventListener('click', () => {
      pendingImage = undefined;
      preview.remove();
      header.textContent = 'Prompt';
      input.rows = 2;
    });

    preview.appendChild(previewImage);
    preview.appendChild(previewMeta);
    preview.appendChild(clearButton);
    inputBox.appendChild(header);
    inputBox.appendChild(preview);
  } else {
    inputBox.appendChild(header);
  }

  const helpText = document.createElement('p');
  helpText.textContent = pendingImage
    ? 'Press Ctrl+Enter to submit. Esc or click away cancels.'
    : 'Press Ctrl+Enter to submit. Esc or click away cancels.';

  inputBox.appendChild(input);
  inputBox.appendChild(helpText);
  shadowRoot.appendChild(inputBox);
  
  // Position the box.
  const selection = window.getSelection();
  let rect;
  if (selection && selection.rangeCount > 0) {
    rect = selection.getRangeAt(0).getBoundingClientRect();
  }

  // A rect with a width of 0 means there's no text selected (it's just a cursor).
  if (rect && rect.width > 0) {
    // If text is selected, position the box near it.
    const boxHeight = inputBox.offsetHeight;
    const boxWidth = 300; // As defined in input-box.css

    let top = rect.bottom + 5;
    let left = rect.left;

    // Adjust position to stay within viewport boundaries
    if (top + boxHeight > window.innerHeight) {
      // Place above the selection if it overflows below
      top = rect.top - boxHeight - 5;
    }
    if (left + boxWidth > window.innerWidth) {
      // Align to the right edge if it overflows
      left = window.innerWidth - boxWidth - 10; // 10px margin
    }

    // Ensure it's not off-screen at the top or left
    if (top < 0) {
      top = 10;
    }
    if (left < 0) {
      left = 10;
    }

    inputBox.style.left = `${left}px`;
    inputBox.style.top = `${top}px`;
  } else {
    // If no text is selected, position the box at the bottom-center of the screen.
    inputBox.style.left = '50%';
    inputBox.style.bottom = '25%';
    inputBox.style.transform = 'translateX(-50%)';
  }

  currentInputBox = container;

  // Handle submission
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const userPrompt = input.value.trim();
      if (userPrompt) {
        chrome.runtime.sendMessage({
          type: 'EXECUTE_PROMPT_REQUEST',
          payload: { selectionText, prompt: userPrompt, imageAttachment: pendingImage },
        });
        dismissInputBox();
      }
    }
  });

  // Handle dismissal via Escape key
  document.addEventListener('keydown', handleEscapeForInputBox);

  // Handle dismissal via click outside
  setTimeout(() => {
    document.addEventListener('click', handleDocumentClickForInputBox);
  }, 0);

  input.focus({preventScroll: true});
}

function dismissInputBox() {
  if (currentInputBox) {
    currentInputBox.remove();
    currentInputBox = null;
  }
  document.removeEventListener('click', handleDocumentClickForInputBox);
  document.removeEventListener('keydown', handleEscapeForInputBox);
}

function handleDocumentClickForInputBox(e: MouseEvent) {
  if (currentInputBox && !currentInputBox.shadowRoot?.contains(e.target as Node)) {
    dismissInputBox();
  }
}

function handleEscapeForInputBox(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    dismissInputBox();
  }
}

// --- CAPTURE IMPLEMENTATION ---

function showRegionSelector() {
  dismissCaptureOverlay();
  dismissInputBox();

  const container = document.createElement('div');
  container.id = 'ask-llm-capture-container';
  document.body.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles/capture-overlay.css');
  shadowRoot.appendChild(styleLink);

  const overlay = document.createElement('div');
  overlay.className = 'ask-llm-capture-overlay';

  const hint = document.createElement('div');
  hint.className = 'capture-hint';
  hint.textContent = 'Drag to select a region. Esc cancels.';

  const selection = document.createElement('div');
  selection.className = 'capture-selection hidden';

  const actions = document.createElement('div');
  actions.className = 'capture-actions hidden';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'capture-btn secondary';
  cancelButton.textContent = 'Cancel';

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'capture-btn primary';
  confirmButton.textContent = 'Use capture';

  actions.appendChild(cancelButton);
  actions.appendChild(confirmButton);
  overlay.appendChild(hint);
  overlay.appendChild(selection);
  overlay.appendChild(actions);
  shadowRoot.appendChild(overlay);

  currentCaptureOverlay = container;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let selectedBounds: CaptureBounds | null = null;

  const updateSelectionBox = (bounds: CaptureBounds) => {
    selection.classList.remove('hidden');
    selection.style.left = `${bounds.x}px`;
    selection.style.top = `${bounds.y}px`;
    selection.style.width = `${bounds.width}px`;
    selection.style.height = `${bounds.height}px`;
  };

  const updateActionPosition = (bounds: CaptureBounds) => {
    actions.classList.remove('hidden');
    const top = Math.min(window.innerHeight - 56, bounds.y + bounds.height + 12);
    const left = Math.min(window.innerWidth - 170, Math.max(16, bounds.x));
    actions.style.top = `${top}px`;
    actions.style.left = `${left}px`;
  };

  const finalizeSelection = (bounds: CaptureBounds) => {
    if (bounds.width < 12 || bounds.height < 12) {
      selectedBounds = null;
      selection.classList.add('hidden');
      actions.classList.add('hidden');
      return;
    }

    selectedBounds = bounds;
    updateSelectionBox(bounds);
    updateActionPosition(bounds);
    hint.textContent = 'Confirm the crop or drag again to replace it.';
  };

  const handlePointerDown = (event: MouseEvent) => {
    const target = event.target as Node;
    if (actions.contains(target)) {
      return;
    }

    event.preventDefault();
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    actions.classList.add('hidden');
    selectedBounds = null;
    updateSelectionBox({ x: startX, y: startY, width: 0, height: 0 });
  };

  const handlePointerMove = (event: MouseEvent) => {
    if (!dragging) {
      return;
    }

    event.preventDefault();

    const x = Math.min(startX, event.clientX);
    const y = Math.min(startY, event.clientY);
    const width = Math.abs(event.clientX - startX);
    const height = Math.abs(event.clientY - startY);
    updateSelectionBox({ x, y, width, height });
  };

  const handlePointerUp = (event: MouseEvent) => {
    if (!dragging) {
      return;
    }

    dragging = false;
    const x = Math.min(startX, event.clientX);
    const y = Math.min(startY, event.clientY);
    const width = Math.abs(event.clientX - startX);
    const height = Math.abs(event.clientY - startY);
    finalizeSelection({ x, y, width, height });
  };

  overlay.addEventListener('mousedown', handlePointerDown);
  overlay.addEventListener('mousemove', handlePointerMove);
  overlay.addEventListener('mouseup', handlePointerUp);
  overlay.addEventListener('mouseleave', handlePointerUp);

  cancelButton.addEventListener('click', () => {
    dismissCaptureOverlay();
  });

  confirmButton.addEventListener('click', async () => {
    if (!selectedBounds) {
      return;
    }

    confirmButton.disabled = true;
    confirmButton.textContent = 'Capturing...';

    try {
      const imageAttachment = await captureSelectedRegion(selectedBounds);
      dismissCaptureOverlay();

      const result = await chrome.storage.local.get('settings');
      const promptMode = result.settings?.promptMode || 'auto';

      if (promptMode === 'manual') {
        showInputBox({ selectionText: '', imageAttachment });
      } else {
        await chrome.runtime.sendMessage({
          type: 'EXECUTE_PROMPT_REQUEST',
          payload: { selectionText: '', imageAttachment },
        });
      }
    } catch (error) {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Use capture';
      await showToast({
        message: `Capture failed: ${String(error)}`,
        type: 'error',
      });
    }
  });

  document.addEventListener('keydown', handleEscapeForCapture);
}

function dismissCaptureOverlay() {
  if (currentCaptureOverlay) {
    currentCaptureOverlay.remove();
    currentCaptureOverlay = null;
  }

  document.removeEventListener('keydown', handleEscapeForCapture);
}

function handleEscapeForCapture(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    dismissCaptureOverlay();
  }
}

async function captureSelectedRegion(bounds: CaptureBounds): Promise<ImageAttachment> {
  const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });

  if (!response?.success || !response.dataUrl) {
    throw new Error(response?.error || 'Unable to capture the current tab.');
  }

  const viewport: CaptureViewport = {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
  };

  return cropCapturedImage(response.dataUrl, bounds, viewport);
}

async function cropCapturedImage(
  captureDataUrl: string,
  bounds: CaptureBounds,
  viewport: CaptureViewport,
): Promise<ImageAttachment> {
  const image = await loadImage(captureDataUrl);
  const pixelBounds = scaleRegionToImage(
    bounds,
    viewport,
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
  );

  const scaledDimensions = getScaledDimensions(pixelBounds.width, pixelBounds.height, 1600);
  const canvas = document.createElement('canvas');
  canvas.width = scaledDimensions.width;
  canvas.height = scaledDimensions.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is unavailable on this page.');
  }

  context.drawImage(
    image,
    pixelBounds.x,
    pixelBounds.y,
    pixelBounds.width,
    pixelBounds.height,
    0,
    0,
    scaledDimensions.width,
    scaledDimensions.height,
  );

  const mimeType = 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, 0.9);

  if (dataUrl.length > 3_500_000) {
    throw new Error('The cropped image is too large. Try selecting a smaller region.');
  }

  return {
    dataUrl,
    mimeType,
    width: scaledDimensions.width,
    height: scaledDimensions.height,
    source: 'capture',
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to read the captured image.'));
    image.src = dataUrl;
  });
}

// --- TOAST IMPLEMENTATION ---
async function showToast(options: ToastOptions) {
  const result = await chrome.storage.local.get('settings');
  const settings = result.settings;
  const position = settings?.toastPosition || options.position || 'bottom-right';
  const discreteMode = settings?.discreteMode || false;
  const opacity = settings?.discreteModeOpacity || 1;
  createToast(options, position, discreteMode, opacity);
}

function createToast(options: ToastOptions, position: 'bottom-left' | 'bottom-right', discreteMode: boolean, opacity: number) {
  dismissToast();
  const { message, type, duration = 20000 } = options;

  const container = document.createElement('div');
  container.id = 'ask-llm-toast-container';
  container.style.cssText = `
    position: fixed;
    ${position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
    bottom: 20px;
    z-index: 2147483647;
    opacity: ${discreteMode ? opacity : 1};
  `;

  const shadowRoot = container.attachShadow({ mode: 'open' });

  const toast = document.createElement('div');
  toast.className = `ask-llm-toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  const style = document.createElement('style');
  style.textContent = `
    .ask-llm-toast {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px 20px;
      max-width: 400px;
      min-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      animation: slideIn 0.3s ease-out;
      display: flex;
      
      gap: 12px;
      max-height: 50vh;
    }

    @keyframes slideIn {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .toast-success { border-left: 4px solid #10b981; }
    .toast-error { border-left: 4px solid #ef4444; }
    .toast-info { border-left: 4px solid #3b82f6; }
    .toast-content { flex: 1; word-wrap: break-word; white-space: pre-wrap; overflow-y: auto; min-height: 0; }
    .toast-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .toast-btn { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 12px; transition: background 0.2s; }
    .toast-btn:hover { background: #f3f4f6; }
    .toast-btn:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
    .close-btn { color: #6b7280; font-weight: bold; }
    .copy-btn { color: #3b82f6; }
  `;
  shadowRoot.appendChild(style);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'toast-content';
  contentDiv.textContent = message;

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'toast-actions';

  if (type === 'success') {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'toast-btn copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.setAttribute('aria-label', 'Copy response');
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(message);
      copyBtn.textContent = 'Copied!';
      if (copyTimeout !== null) clearTimeout(copyTimeout);
      copyTimeout = window.setTimeout(() => { if (copyBtn) copyBtn.textContent = 'Copy'; }, 2000);
    };
    actionsDiv.appendChild(copyBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-btn close-btn';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.onclick = dismissToast;
  actionsDiv.appendChild(closeBtn);

  toast.appendChild(contentDiv);
  toast.appendChild(actionsDiv);
  shadowRoot.appendChild(toast);
  document.body.appendChild(container);

  currentToast = container;

  if (duration > 0) {
    toastTimeout = window.setTimeout(dismissToast, duration);
  }

  document.addEventListener('keydown', handleEscapeForToast);
}

function handleEscapeForToast(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    dismissToast();
  }
}

function dismissToast() {
  if (currentToast) {
    currentToast.remove();
    currentToast = null;
  }
  if (toastTimeout !== null) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  if (copyTimeout !== null) {
    clearTimeout(copyTimeout);
    copyTimeout = null;
  }
  document.removeEventListener('keydown', handleEscapeForToast);
}