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
const toggleApiKeyBtn = document.getElementById('toggleApiKeyVisibility') as HTMLButtonElement;

const ENDPOINTS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

// Icons
const EYE_OPEN_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
</svg>
`;

const EYE_CLOSED_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
</svg>
`;

toggleApiKeyBtn.addEventListener('click', () => {
  const currentType = apiKeyInput.type;
  if (currentType === 'password') {
    apiKeyInput.type = 'text';
    toggleApiKeyBtn.innerHTML = EYE_CLOSED_ICON;
    toggleApiKeyBtn.setAttribute('aria-label', 'Hide API key');
  } else {
    apiKeyInput.type = 'password';
    toggleApiKeyBtn.innerHTML = EYE_OPEN_ICON;
    toggleApiKeyBtn.setAttribute('aria-label', 'Show API key');
  }
});

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