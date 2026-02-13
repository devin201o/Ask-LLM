import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome API
const mockChrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    }
  },
  runtime: {
    sendMessage: vi.fn(),
  }
};
(globalThis as any).chrome = mockChrome;

// Mock window.prompt
(globalThis as any).prompt = vi.fn();

describe('Password Toggle', () => {
  beforeEach(() => {
    // Set up a minimal DOM that satisfies options.ts requirements
    document.body.innerHTML = `
      <form id="settingsForm">
        <input type="password" id="apiKey" />
        <button type="button" id="toggleApiKeyBtn" aria-label="Show API Key"></button>

        <select id="provider">
            <option value="openrouter">OpenRouter</option>
            <option value="custom">Custom</option>
        </select>
        <input id="apiEndpoint" />
        <select id="model"></select>
        <button id="addModelBtn"></button>
        <button id="deleteModelBtn"></button>
        <input id="maxTokens" value="100" />
        <select id="toastPosition"></select>
        <input id="toastDuration" value="5" />
        <input type="checkbox" id="toastIndefinite" />
        <button id="testBtn"></button>
        <div id="status"></div>
        <div id="endpointGroup"></div>

        <input type="radio" name="promptMode" value="auto" checked>
        <input type="radio" name="promptMode" value="manual">
        <input type="radio" name="promptMode" value="custom">

        <div id="customPromptContainer"></div>
        <textarea id="customPrompt"></textarea>

        <input type="checkbox" id="discreteMode" />
        <div id="opacityGroup"></div>
        <input id="discreteModeOpacity" value="0.5" />
        <span id="opacityValue"></span>
      </form>
    `;

    vi.resetModules();
  });

  it('should toggle password visibility and aria-label', async () => {
    // Import the module to attach event listeners
    // We need to ignore the promise returned by loadSettings if possible,
    // or just let it run since we mocked chrome.storage.
    await import('./options');

    const input = document.getElementById('apiKey') as HTMLInputElement;
    const btn = document.getElementById('toggleApiKeyBtn') as HTMLButtonElement;

    // Initial state
    expect(input.type).toBe('password');
    expect(btn.getAttribute('aria-label')).toBe('Show API Key');

    // Click to show
    btn.click();

    expect(input.type).toBe('text');
    expect(btn.getAttribute('aria-label')).toBe('Hide API Key');
    expect(btn.innerHTML).toContain('lucide-eye-off');

    // Click to hide
    btn.click();

    expect(input.type).toBe('password');
    expect(btn.getAttribute('aria-label')).toBe('Show API Key');
    expect(btn.innerHTML).toContain('lucide-eye');
  });
});
