export interface ExtensionSettings {
  enabled: boolean;
  apiKey: string;
  apiEndpoint: string;
  models: string[];
  selectedModel: string;
  toastDuration: number;
  toastIndefinite: boolean;
  toastPosition: 'bottom-left' | 'bottom-right';
  provider: 'openrouter' | 'custom';
  promptMode: 'auto' | 'manual' | 'custom';
  customPrompt: string;
  discreteMode: boolean;
  discreteModeOpacity: number;
  maxTokens: number;
}

export interface CaptureBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureViewport {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
}

export interface ImageAttachment {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  source: 'capture';
}

export interface PromptRequestPayload {
  selectionText: string;
  prompt?: string;
  imageAttachment?: ImageAttachment;
}

export interface ShowInputBoxPayload {
  selectionText: string;
  imageAttachment?: ImageAttachment;
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface ToastOptions {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  position?: 'bottom-left' | 'bottom-right';
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  apiKey: '',
  apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
  models: ['google/gemini-2.5-flash'],
  selectedModel: 'google/gemini-2.5-flash',
  toastDuration: 20000,
  toastIndefinite: false,
  toastPosition: 'bottom-right',
  provider: 'openrouter',
  promptMode: 'auto',
  customPrompt: 'You are a helpful assistant.',
  discreteMode: false,
  discreteModeOpacity: 0.85,
  maxTokens: 500,
};