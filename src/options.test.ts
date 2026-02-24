import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Mock the chrome API
const chromeMock = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({ settings: {} }),
      set: vi.fn(),
    },
    onChanged: {
        addListener: vi.fn(),
    }
  },
  runtime: {
    sendMessage: vi.fn(),
  },
};

vi.stubGlobal('chrome', chromeMock);

describe('Options Page', () => {
  beforeEach(async () => {
    vi.resetModules(); // Important to reset module state

    // Load the actual HTML file
    const htmlContent = fs.readFileSync(path.resolve(__dirname, 'options.html'), 'utf-8');
    const dom = new JSDOM(htmlContent, {
        url: 'http://localhost', // Set a URL to avoid errors with some APIs
        runScripts: "dangerously",
        resources: "usable"
    });

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
    vi.stubGlobal('HTMLFormElement', dom.window.HTMLFormElement);
    vi.stubGlobal('HTMLInputElement', dom.window.HTMLInputElement);
    vi.stubGlobal('HTMLSelectElement', dom.window.HTMLSelectElement);
    vi.stubGlobal('HTMLButtonElement', dom.window.HTMLButtonElement);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);
    vi.stubGlobal('HTMLTextAreaElement', dom.window.HTMLTextAreaElement);
    vi.stubGlobal('HTMLSpanElement', dom.window.HTMLSpanElement);

    // Reset mocks
    (chrome.storage.local.get as unknown as Mock).mockClear();
    (chrome.storage.local.get as unknown as Mock).mockResolvedValue({ settings: {} });

    // Import the options script to attach listeners
    // We append a query string to force re-import if needed, but vi.resetModules() should handle it.
    await import('./options');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should toggle password visibility when the button is clicked', () => {
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.querySelector('.toggle-password-btn') as HTMLButtonElement;

    expect(apiKeyInput).not.toBeNull();
    expect(toggleBtn).not.toBeNull();

    // Initial state
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');

    // Click to show password
    toggleBtn.click();
    expect(apiKeyInput.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Hide password');
    expect(toggleBtn.innerHTML).toContain('<line'); // The eye-off icon has a <line> element

    // Click to hide password
    toggleBtn.click();
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');
    expect(toggleBtn.innerHTML).not.toContain('<line'); // The eye icon does not have a <line> element
    expect(toggleBtn.innerHTML).toContain('<circle'); // The eye icon has a <circle> element
  });
});
