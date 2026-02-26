import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock chrome
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

// Simplified HTML content containing all necessary IDs
const OPTIONS_HTML = `
<!DOCTYPE html>
<html>
<body>
  <form id="settingsForm">
    <select id="provider"><option value="openrouter">OpenRouter</option></select>

    <div class="input-wrapper">
      <input type="password" id="apiKey" />
      <button type="button" id="toggleApiKeyBtn" aria-label="Show API Key"></button>
    </div>

    <input id="apiEndpoint" />
    <select id="model"></select>
    <button id="addModelBtn"></button>
    <button id="deleteModelBtn"></button>
    <input id="maxTokens" />
    <select id="toastPosition"></select>
    <input id="toastDuration" />
    <input type="checkbox" id="toastIndefinite" />
    <input type="radio" name="promptMode" value="auto" />
    <input type="radio" name="promptMode" value="manual" />
    <input type="radio" name="promptMode" value="custom" />
    <div id="customPromptContainer"></div>
    <textarea id="customPrompt"></textarea>
    <input type="checkbox" id="discreteMode" />
    <div id="opacityGroup"></div>
    <input id="discreteModeOpacity" type="range" />
    <span id="opacityValue"></span>
    <div id="endpointGroup"></div>
    <button type="submit"></button>
    <button type="button" id="testBtn"></button>
    <div id="status"></div>
  </form>
</body>
</html>
`;

describe('Options Page', () => {
  beforeEach(async () => {
    vi.resetModules();

    const dom = new JSDOM(OPTIONS_HTML);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('prompt', vi.fn());

    // We need to wait for the module to load
    await import('./options.ts?v=' + Date.now());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should toggle password visibility when button is clicked', () => {
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.getElementById('toggleApiKeyBtn') as HTMLButtonElement;

    // Initial state
    expect(apiKeyInput.getAttribute('type')).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show API Key');

    // Click to show password
    toggleBtn.click();
    expect(apiKeyInput.getAttribute('type')).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Hide API Key');

    // Click to hide password
    toggleBtn.click();
    expect(apiKeyInput.getAttribute('type')).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show API Key');
  });
});
