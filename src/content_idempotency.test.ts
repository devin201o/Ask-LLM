import { describe, it, expect, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock the chrome API
const chromeMock = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    getURL: vi.fn((path) => path),
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({ settings: {} }),
    },
  },
};

describe('Content Script Idempotency', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('should register listeners only once even if reinjected', async () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);
    vi.stubGlobal('chrome', chromeMock);

    // First injection
    await import('./content.ts?v=' + Date.now());

    // Force module reset to allow re-importing the same file (simulating re-execution)
    vi.resetModules();

    // Second injection
    await import('./content.ts?v=' + (Date.now() + 1));

    // With the fix, we expect addListener to be called ONLY ONCE
    expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
  });

  it('should respond to unknown messages', async () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);
    vi.stubGlobal('chrome', chromeMock);

    await import('./content.ts?v=' + Date.now());

    const listener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn();

    // Test unknown message
    listener({ type: 'UNKNOWN' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });
});
