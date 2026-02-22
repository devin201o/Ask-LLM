import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

// Mock chrome global
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

// We need to read the HTML file content
const htmlContent = fs.readFileSync(path.resolve(process.cwd(), 'src/options.html'), 'utf8');

describe('Options Page', () => {
  beforeEach(async () => {
    vi.resetModules();

    // Mock console.error to suppress JSDOM CSS errors
    const originalConsoleError = console.error;
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      if (typeof args[0] === 'string' && args[0].includes('Could not load link')) return;
      originalConsoleError(...args);
    });

    const dom = new JSDOM(htmlContent, {
      url: 'http://localhost/',
      runScripts: 'dangerously',
      resources: 'usable',
    });

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('navigator', dom.window.navigator);
    vi.stubGlobal('prompt', vi.fn());

    // Stub other global objects needed by the script
    vi.stubGlobal('HTMLFormElement', dom.window.HTMLFormElement);
    vi.stubGlobal('HTMLSelectElement', dom.window.HTMLSelectElement);
    vi.stubGlobal('HTMLInputElement', dom.window.HTMLInputElement);
    vi.stubGlobal('HTMLButtonElement', dom.window.HTMLButtonElement);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);
    vi.stubGlobal('HTMLTextAreaElement', dom.window.HTMLTextAreaElement);
    vi.stubGlobal('HTMLSpanElement', dom.window.HTMLSpanElement);

    // Attempt to re-import the module
    // We use a variable to avoid static analysis errors with template literals in import()
    // if that was the cause.
    try {
      await import('./options');
    } catch (e) {
      // If it fails, maybe because of path resolution in test env
      console.error("Failed to import options:", e);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should toggle password visibility when button is clicked', async () => {
    // Re-query elements from the new DOM
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.querySelector('.toggle-password-btn') as HTMLButtonElement;

    expect(apiKeyInput).not.toBeNull();
    expect(toggleBtn).not.toBeNull();

    // Initial state
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');

    // Click to show
    toggleBtn.click();
    expect(apiKeyInput.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Hide password');

    // Click to hide
    toggleBtn.click();
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');
  });
});
