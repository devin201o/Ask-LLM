import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock the chrome API and other browser features
const addListenerMock = vi.fn();
const storageGetMock = vi.fn().mockResolvedValue({ settings: {} });

const chromeMock = {
  runtime: {
    onMessage: {
      addListener: addListenerMock,
    },
  },
  storage: {
    local: {
      get: storageGetMock,
    },
  },
};

vi.stubGlobal('chrome', chromeMock);
vi.stubGlobal('navigator', {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('Content Script Toasts', () => {
  let messageListener: ((message: any, sender: unknown, sendResponse: (response?: any) => void) => unknown) | undefined;

  beforeEach(async () => {
    // Use fake timers to control setTimeout and clearTimeout
    vi.useFakeTimers();

    // Set up a fresh DOM for each test
    const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);

    // Reset mocks
    addListenerMock.mockClear();
    storageGetMock.mockResolvedValue({ settings: {} });

    // Dynamically import the content script to re-run its setup logic for each test.
    // The cache-busting query `?v=` ensures the module is re-evaluated.
    await import('./content.ts?v=' + Date.now());

    // The script adds a listener, so we grab it from our mock.
    if (addListenerMock.mock.calls.length > 0) {
      messageListener = addListenerMock.mock.calls[0][0];
    }
  });

  afterEach(() => {
    // Restore real timers and clean up globals
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should clear both toast and copy timeouts when dismissed', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    expect(messageListener).toBeDefined();

    // 1. Show a success toast
    await messageListener!(
      { type: 'SHOW_TOAST', payload: { message: 'Success!', type: 'success', duration: 5000 } },
      {},
      () => {}
    );

    // 2. Click the "Copy" button, which is inside the Shadow DOM
    const container = document.getElementById('ask-llm-toast-container');
    expect(container).not.toBeNull();
    const shadowRoot = container!.shadowRoot;
    expect(shadowRoot).not.toBeNull();
    const copyBtn = shadowRoot.querySelector('.copy-btn');
    expect(copyBtn).not.toBeNull();
    copyBtn!.dispatchEvent(new window.Event('click'));

    // 3. Dismiss the toast immediately
    const closeBtn = shadowRoot.querySelector('.close-btn');
    expect(closeBtn).not.toBeNull();
    closeBtn!.dispatchEvent(new window.Event('click'));

    // 4. Assert that clearTimeout was called twice: once for the main toast
    // and once for the copy button's text-revert timeout.
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    clearTimeoutSpy.mockRestore();
  });
});