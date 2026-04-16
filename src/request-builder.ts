import { DEFAULT_PROMPTS } from './prompts';
import type { ExtensionSettings, ImageAttachment } from './types';

export const MANUAL_MODE_PROMPT_APPENDIX = 'Please be concise, while still being clear and informative.';

export function resolveSystemPrompt(settings: ExtensionSettings, manualPrompt?: string) {
  if (manualPrompt) {
    return `${manualPrompt} ${MANUAL_MODE_PROMPT_APPENDIX}`;
  }

  if (settings.promptMode === 'custom') {
    return settings.customPrompt;
  }

  return DEFAULT_PROMPTS.conciseAcademic;
}

export function buildChatCompletionRequest(
  text: string,
  settings: ExtensionSettings,
  manualPrompt?: string,
  imageAttachment?: ImageAttachment,
) {
  const systemPrompt = resolveSystemPrompt(settings, manualPrompt);
  const trimmedText = text.trim();

  const userContent = imageAttachment
    ? [
        {
          type: 'text' as const,
          text: trimmedText || 'Analyze the attached image.',
        },
        {
          type: 'image_url' as const,
          image_url: {
            url: imageAttachment.dataUrl,
          },
        },
      ]
    : trimmedText;

  return {
    model: settings.selectedModel,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userContent },
    ],
    max_tokens: settings.maxTokens,
  };
}