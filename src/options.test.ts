import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

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

describe('Options Page Password Toggle', () => {
  beforeEach(() => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="settingsForm">
            <select id="provider"><option value="openrouter">OpenRouter</option></select>
            <div class="input-wrapper">
                <input id="apiKey" type="password" />
                <button class="toggle-password-btn" aria-label="Show password"></button>
            </div>
            <input id="apiEndpoint" />
            <select id="model"></select>
            <button id="addModelBtn"></button>
            <button id="deleteModelBtn"></button>
            <input id="maxTokens" />
            <select id="toastPosition"></select>
            <input id="toastDuration" />
            <input id="toastIndefinite" type="checkbox" />
            <button id="testBtn"></button>
            <div id="status"></div>
            <div id="endpointGroup"></div>
            <input name="promptMode" value="auto" type="radio" />
            <input name="promptMode" value="manual" type="radio" />
            <input name="promptMode" value="custom" type="radio" />
            <div id="customPromptContainer"></div>
            <textarea id="customPrompt"></textarea>
            <input id="discreteMode" type="checkbox" />
            <div id="opacityGroup"></div>
            <input id="discreteModeOpacity" />
            <span id="opacityValue"></span>
          </form>
        </body>
      </html>
    `);

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLFormElement', dom.window.HTMLFormElement);
    vi.stubGlobal('HTMLSelectElement', dom.window.HTMLSelectElement);
    vi.stubGlobal('HTMLInputElement', dom.window.HTMLInputElement);
    vi.stubGlobal('HTMLButtonElement', dom.window.HTMLButtonElement);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);
    vi.stubGlobal('HTMLTextAreaElement', dom.window.HTMLTextAreaElement);
    vi.stubGlobal('HTMLSpanElement', dom.window.HTMLSpanElement);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('should toggle password visibility when button is clicked', async () => {
    // Import the module to attach listeners
    await import('./options');

    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.querySelector('.toggle-password-btn') as HTMLButtonElement;

    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');

    // Click to show password
    toggleBtn.dispatchEvent(new window.Event('click'));
    expect(apiKeyInput.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Hide password');

    // Click to hide password
    toggleBtn.dispatchEvent(new window.Event('click'));
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');
  });
});
