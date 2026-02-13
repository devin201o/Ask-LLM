import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock the chrome API and other browser features
const chromeMock = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({ settings: {} }),
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
  let messageListener: any;

  beforeEach(async () => {
    // Use fake timers to control setTimeout and clearTimeout
    vi.useFakeTimers();

    // Set up a fresh DOM for each test
    const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);

    // Reset mocks
    (chrome.runtime.onMessage.addListener as unknown as Mock).mockClear();
    (chrome.storage.local.get as unknown as Mock).mockResolvedValue({ settings: {} });

    // Dynamically import the content script to re-run its setup logic for each test.
    // The cache-busting query `?v=` ensures the module is re-evaluated.
    await import('./content.ts?v=' + Date.now());

    // The script adds a listener, so we grab it from our mock.
    const mockCalls = (chrome.runtime.onMessage.addListener as unknown as Mock).mock.calls;
    if (mockCalls.length > 0) {
      messageListener = mockCalls[0][0];
    }
  });

  afterEach(() => {
    // Restore real timers and clean up globals
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should clear both toast and copy timeouts when dismissed', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    // 1. Show a success toast
    if (messageListener) {
      await messageListener(
        { type: 'SHOW_TOAST', payload: { message: 'Success!', type: 'success', duration: 5000 } },
        {},
        () => {}
      );
    }

    // 2. Click the "Copy" button, which is inside the Shadow DOM
    const container = document.getElementById('ask-llm-toast-container');
    const shadowRoot = container?.shadowRoot;
    const copyBtn = shadowRoot?.querySelector('.copy-btn');
    expect(copyBtn).toBeTruthy();
    copyBtn?.dispatchEvent(new window.Event('click'));

    // 3. Dismiss the toast immediately
    const closeBtn = shadowRoot?.querySelector('.close-btn');
    expect(closeBtn).toBeTruthy();
    closeBtn?.dispatchEvent(new window.Event('click'));

    // 4. Assert that clearTimeout was called twice: once for the main toast
    // and once for the copy button's text-revert timeout.
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    clearTimeoutSpy.mockRestore();
  });
});