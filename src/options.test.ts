import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock chrome API
const chromeMock = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({ settings: {} }),
      set: vi.fn(),
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

// Stub prompt
vi.stubGlobal('prompt', vi.fn());

describe('Options Page Password Toggle', () => {
  let dom: JSDOM;

  beforeEach(async () => {
    // Manually create the DOM structure expected by options.ts
    // This avoids needing fs and reading the file
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="settingsForm">
            <select id="provider"><option value="openrouter">OpenRouter</option></select>
            <div class="input-wrapper">
              <input type="password" id="apiKey" />
              <button type="button" class="toggle-password-btn" aria-label="Show password"></button>
            </div>
            <input type="url" id="apiEndpoint" />
            <select id="model"></select>
            <button id="addModelBtn"></button>
            <button id="deleteModelBtn"></button>
            <input type="number" id="maxTokens" value="1000" />
            <select id="toastPosition"></select>
            <input type="number" id="toastDuration" value="5" />
            <input type="checkbox" id="toastIndefinite" />
            <button type="button" id="testBtn"></button>
            <div id="status"></div>
            <div id="endpointGroup"></div>
            <input type="radio" name="promptMode" value="auto" checked />
            <div id="customPromptContainer"></div>
            <textarea id="customPrompt"></textarea>
            <input type="checkbox" id="discreteMode" />
            <div id="opacityGroup"></div>
            <input type="range" id="discreteModeOpacity" />
            <span id="opacityValue"></span>
          </form>
        </body>
      </html>
    `, {
      url: 'http://localhost',
    });

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
    vi.stubGlobal('HTMLInputElement', dom.window.HTMLInputElement);
    vi.stubGlobal('HTMLButtonElement', dom.window.HTMLButtonElement);
    vi.stubGlobal('HTMLFormElement', dom.window.HTMLFormElement);
    vi.stubGlobal('HTMLSelectElement', dom.window.HTMLSelectElement);
    vi.stubGlobal('HTMLDivElement', dom.window.HTMLDivElement);
    vi.stubGlobal('HTMLTextAreaElement', dom.window.HTMLTextAreaElement);
    vi.stubGlobal('HTMLSpanElement', dom.window.HTMLSpanElement);

    // Reset modules to re-execute the top-level code in options.ts
    vi.resetModules();

    // Import the options script
    // We catch errors because options.ts might try to do things we haven't fully mocked
    // but as long as it attaches the listener we care about, we're good.
    try {
      await import('./options.ts?v=' + Date.now());
    } catch (e) {
      console.error('Error importing options.ts', e);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should toggle password visibility when button is clicked', () => {
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.querySelector('.toggle-password-btn') as HTMLButtonElement;

    // Initial state
    expect(apiKeyInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');
    // We can't easily check innerHTML for the SVG since we don't have the constants exported,
    // but we can check if it changes or if we want to be precise, we can check the aria-label which is enough for a11y.

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
