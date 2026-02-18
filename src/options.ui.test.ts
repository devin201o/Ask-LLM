import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Mock the chrome API
const chromeMock = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({ settings: {} }),
      set: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
  },
};

vi.stubGlobal('chrome', chromeMock);

describe('Options Page UI', () => {
  beforeEach(async () => {
    vi.resetModules(); // Reset modules to force re-execution

    // Load the HTML content
    const htmlPath = path.resolve(__dirname, 'options.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Set up JSDOM
    const dom = new JSDOM(htmlContent, {
      url: 'http://localhost/',
      runScripts: 'dangerously',
      resources: 'usable',
    });

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
    vi.stubGlobal('HTMLInputElement', dom.window.HTMLInputElement);
    vi.stubGlobal('HTMLButtonElement', dom.window.HTMLButtonElement);
    vi.stubGlobal('prompt', vi.fn());

    // Reset mocks
    (chrome.storage.local.get as unknown as any).mockResolvedValue({ settings: {} });

    // Import the options script logic
    await import('./options');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should toggle API key visibility when the button is clicked', async () => {
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.getElementById('toggleApiKeyVisibility') as HTMLButtonElement;

    expect(apiKeyInput).not.toBeNull();
    expect(toggleBtn).not.toBeNull();

    // Initial state
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show API Key');

    // Click to show password
    toggleBtn.click();

    expect(apiKeyInput.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Hide API Key');

    // Click to hide password
    toggleBtn.click();

    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show API Key');
  });
});
