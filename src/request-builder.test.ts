import { describe, expect, it } from 'vitest';

import { buildChatCompletionRequest, resolveSystemPrompt } from './request-builder';
import { DEFAULT_SETTINGS } from './types';

describe('request-builder', () => {
  it('builds a text-only chat request', () => {
    const request = buildChatCompletionRequest('Explain this', DEFAULT_SETTINGS);

    expect(request.messages).toHaveLength(2);
    expect(request.messages[1]).toEqual({ role: 'user', content: 'Explain this' });
  });

  it('builds a multimodal request when an image is attached', () => {
    const request = buildChatCompletionRequest('Read this screenshot', DEFAULT_SETTINGS, undefined, {
      dataUrl: 'data:image/jpeg;base64,abc',
      mimeType: 'image/jpeg',
      width: 400,
      height: 300,
      source: 'capture',
    });

    expect(request.messages[1]).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: 'Read this screenshot' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
      ],
    });
  });

  it('uses the manual prompt when provided', () => {
    const prompt = resolveSystemPrompt(DEFAULT_SETTINGS, 'Summarize the image');

    expect(prompt).toContain('Summarize the image');
  });
});