import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

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

describe('Options Page Password Toggle', () => {
  beforeEach(async () => {
    // Set up a fresh DOM for each test
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <form id="settingsForm">
          <div class="form-group">
            <label for="apiKey">OpenRouter API Key</label>
            <div class="input-wrapper">
              <input type="password" id="apiKey" name="apiKey" />
              <button type="button" class="toggle-password-btn" aria-label="Show password">
                <svg class="eye-icon"></svg>
              </button>
            </div>
          </div>

          <!-- Other required elements to prevent options.ts from crashing -->
          <select id="provider"><option value="openrouter">OpenRouter</option></select>
          <input id="apiEndpoint" />
          <div id="endpointGroup"></div>
          <select id="model"></select>
          <button id="addModelBtn"></button>
          <button id="deleteModelBtn"></button>
          <input id="maxTokens" />
          <select id="toastPosition"></select>
          <input id="toastDuration" />
          <input id="toastIndefinite" type="checkbox" />
          <input type="radio" name="promptMode" value="auto" checked />
          <input type="radio" name="promptMode" value="manual" />
          <input type="radio" name="promptMode" value="custom" />
          <div id="customPromptContainer"></div>
          <textarea id="customPrompt"></textarea>
          <input id="discreteMode" type="checkbox" />
          <div id="opacityGroup"></div>
          <input id="discreteModeOpacity" type="range" />
          <span id="opacityValue"></span>
          <button id="testBtn"></button>
          <div id="status"></div>
        </form>
      </body>
      </html>
    `);

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLInputElement', dom.window.HTMLInputElement);
    vi.stubGlobal('HTMLSelectElement', dom.window.HTMLSelectElement);
    vi.stubGlobal('HTMLButtonElement', dom.window.HTMLButtonElement);
    vi.stubGlobal('HTMLFormElement', dom.window.HTMLFormElement);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);
    vi.stubGlobal('HTMLTextAreaElement', dom.window.HTMLTextAreaElement);
    vi.stubGlobal('HTMLSpanElement', dom.window.HTMLSpanElement);

    // Reset mocks
    chrome.storage.local.get.mockResolvedValue({ settings: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('should toggle password visibility when button is clicked', async () => {
    // Import the options script to initialize listeners
    await import('./options.ts?v=' + Date.now());

    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.querySelector('.toggle-password-btn') as HTMLButtonElement;

    // Initial state
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');

    // Click to show password
    toggleBtn.click();
    expect(apiKeyInput.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Hide password');

    // Click to hide password
    toggleBtn.click();
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');
  });
});
