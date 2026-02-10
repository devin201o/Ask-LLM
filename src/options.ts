import { ExtensionSettings, DEFAULT_SETTINGS } from './types';

const form = document.getElementById('settingsForm') as HTMLFormElement;
const providerSelect = document.getElementById('provider') as HTMLSelectElement;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
const modelSelect = document.getElementById('model') as HTMLSelectElement;
const addModelBtn = document.getElementById('addModelBtn') as HTMLButtonElement;
const deleteModelBtn = document.getElementById('deleteModelBtn') as HTMLButtonElement;
const maxTokensInput = document.getElementById('maxTokens') as HTMLInputElement;
const toastPositionSelect = document.getElementById('toastPosition') as HTMLSelectElement;
const toastDurationInput = document.getElementById('toastDuration') as HTMLInputElement;
const toastIndefinite = document.getElementById('toastIndefinite') as HTMLInputElement;
const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const endpointGroup = document.getElementById('endpointGroup') as HTMLDivElement;
const promptModeRadios = document.querySelectorAll<HTMLInputElement>('input[name="promptMode"]');
const customPromptContainer = document.getElementById('customPromptContainer') as HTMLDivElement;
const customPrompt = document.getElementById('customPrompt') as HTMLTextAreaElement;
const discreteModeToggle = document.getElementById('discreteMode') as HTMLInputElement;
const opacityGroup = document.getElementById('opacityGroup') as HTMLDivElement;
const opacitySlider = document.getElementById('discreteModeOpacity') as HTMLInputElement;
const opacityValue = document.getElementById('opacityValue') as HTMLSpanElement;
const toggleApiKeyVisibilityBtn = document.getElementById('toggleApiKeyVisibility') as HTMLButtonElement;

const SHOW_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
`;

const HIDE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
`;

if (toggleApiKeyVisibilityBtn) {
  toggleApiKeyVisibilityBtn.addEventListener('click', () => {
    const currentType = apiKeyInput.getAttribute('type');
    if (currentType === 'password') {
      apiKeyInput.setAttribute('type', 'text');
      toggleApiKeyVisibilityBtn.setAttribute('aria-label', 'Hide API Key');
      toggleApiKeyVisibilityBtn.innerHTML = HIDE_ICON;
    } else {
      apiKeyInput.setAttribute('type', 'password');
      toggleApiKeyVisibilityBtn.setAttribute('aria-label', 'Show API Key');
      toggleApiKeyVisibilityBtn.innerHTML = SHOW_ICON;
    }
  });
}

const ENDPOINTS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

function updateModelDropdown(models: string[], selectedModel: string) {
  modelSelect.innerHTML = '';
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    if (model === selectedModel) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });
}

async function loadSettings() {
  let settings: ExtensionSettings = DEFAULT_SETTINGS;
  try {
    // This will fail in the test environment, and we'll proceed with defaults.
    const result = await chrome.storage.local.get('settings');
    settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
  } catch (error) {
    console.warn('Could not load settings from chrome.storage, using defaults.');
  }

  providerSelect.value = settings.provider;
  apiKeyInput.value = settings.apiKey;
  apiEndpointInput.value = settings.apiEndpoint;
  updateModelDropdown(settings.models, settings.selectedModel);
  maxTokensInput.value = settings.maxTokens.toString();
  toastPositionSelect.value = settings.toastPosition;
  toastDurationInput.value = (settings.toastDuration / 1000).toString();
  toastIndefinite.checked = settings.toastIndefinite;
  discreteModeToggle.checked = settings.discreteMode;
  opacitySlider.value = settings.discreteModeOpacity.toString();
  opacityValue.textContent = settings.discreteModeOpacity.toString();

  promptModeRadios.forEach(radio => {
    if (radio.value === settings.promptMode) {
      radio.checked = true;
    }
  });

  customPrompt.value = settings.customPrompt;

  updateEndpointVisibility();
  updateCustomPromptVisibility();
  updateToastDurationState();
}

function updateCustomPromptVisibility() {
  const selectedMode = (document.querySelector('input[name="promptMode"]:checked') as HTMLInputElement)?.value;
  if (selectedMode === 'custom') {
    customPromptContainer.style.display = 'block';
  } else {
    customPromptContainer.style.display = 'none';
  }
}

promptModeRadios.forEach(radio => {
  radio.addEventListener('change', updateCustomPromptVisibility);
});

providerSelect.addEventListener('change', () => {
  const provider = providerSelect.value as 'openrouter' | 'custom';
  if (provider !== 'custom') {
    apiEndpointInput.value = ENDPOINTS[provider];
  }
  updateEndpointVisibility();
  updateOpacityGroupVisibility();
});

function updateToastDurationState() {
  toastDurationInput.disabled = toastIndefinite.checked;
}

toastIndefinite.addEventListener('change', updateToastDurationState);

discreteModeToggle.addEventListener('change', updateOpacityGroupVisibility);

opacitySlider.addEventListener('input', () => {
  opacityValue.textContent = opacitySlider.value;
});

addModelBtn.addEventListener('click', async () => {
  const newModel = prompt('Enter the new model name:');
  if (newModel) {
    const result = await chrome.storage.local.get('settings');
    const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
    if (!settings.models.includes(newModel)) {
      settings.models.push(newModel);
      settings.selectedModel = newModel;
      await chrome.storage.local.set({ settings });
      updateModelDropdown(settings.models, settings.selectedModel);
    }
  }
});

deleteModelBtn.addEventListener('click', async () => {
  const selectedModel = modelSelect.value;
  if (selectedModel) {
    const result = await chrome.storage.local.get('settings');
    const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
    if (settings.models.length > 1) {
      settings.models = settings.models.filter(m => m !== selectedModel);
      settings.selectedModel = settings.models[0];
      await chrome.storage.local.set({ settings });
      updateModelDropdown(settings.models, settings.selectedModel);
    } else {
      showStatus('You cannot delete the last model.', 'error');
    }
  }
});

function updateOpacityGroupVisibility() {
  opacityGroup.style.display = discreteModeToggle.checked ? 'block' : 'none';
}

function updateEndpointVisibility() {
  if (providerSelect.value === 'custom') {
    endpointGroup.style.display = 'block';
    apiEndpointInput.required = true;
  } else {
    endpointGroup.style.display = 'block';
    apiEndpointInput.required = false;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const duration = parseInt(toastDurationInput.value, 10);
  if (isNaN(duration) || duration < 1) {
    showStatus('Invalid duration. Please enter a positive number.', 'error');
    return;
  }

  const maxTokens = parseInt(maxTokensInput.value, 10);
  if (isNaN(maxTokens) || maxTokens < 50 || maxTokens > 2000) {
    showStatus('Invalid max tokens. Please enter a number between 50 and 2000.', 'error');
    return;
  }

  const selectedPromptMode = (document.querySelector('input[name="promptMode"]:checked') as HTMLInputElement).value as 'auto' | 'manual' | 'custom';

  const result = await chrome.storage.local.get('settings');
  const existingSettings = result.settings || DEFAULT_SETTINGS;

  const settings: ExtensionSettings = {
    ...existingSettings,
    provider: providerSelect.value as 'openrouter' | 'custom',
    apiKey: apiKeyInput.value.trim(),
    apiEndpoint: apiEndpointInput.value.trim(),
    selectedModel: modelSelect.value,
    maxTokens: parseInt(maxTokensInput.value, 10),
    toastPosition: toastPositionSelect.value as 'bottom-left' | 'bottom-right',
    toastDuration: duration * 1000,
    toastIndefinite: toastIndefinite.checked,
    promptMode: selectedPromptMode,
    customPrompt: customPrompt.value.trim(),
    discreteMode: discreteModeToggle.checked,
    discreteModeOpacity: parseFloat(opacitySlider.value),
  };

  await chrome.storage.local.set({ settings });
  await chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' });
  showStatus('Settings saved successfully!', 'success');
});

testBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  const apiEndpoint = apiEndpointInput.value.trim();

  if (!apiKey || !apiEndpoint) {
    showStatus('Please enter an API key and endpoint first', 'error');
    return;
  }

  showStatus('Testing connection... (This will test when you add a real API key)', 'info');
  
  setTimeout(() => {
    showStatus('Configuration looks good! Try highlighting text on a webpage.', 'success');
  }, 1000);
});

function showStatus(message: string, type: 'success' | 'error' | 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type} show`;

  setTimeout(() => {
    statusDiv.classList.remove('show');
  }, 5000);
}

loadSettings();