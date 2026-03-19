export type LabelPromptInputs = {
  title: string;
  subtitle: string;
  theme?: string;
  subTheme?: string;
  mainSubjectType?: string;
  mainSubject?: string;
  action?: string;
  styleFamily?: string;
  paletteVibe?: string;
};

export type GeminiPromptResult = {
  prompt: string;
  raw: unknown;
};

export type GeminiImageResult = {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  raw: unknown;
};

const GEMINI_TEXT_MODEL = 'gemini-3-pro-preview';
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

const safeJsonParse = (text: string) => {
  try {
    return { ok: true as const, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false as const, error };
  }
};

const getApiKey = () =>
  (process.env.REACT_APP_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '').trim();

const geminiFetch = async (model: string, body: Record<string, unknown>) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Add REACT_APP_GEMINI_API_KEY to .env for client-side usage.');
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    const parsed = safeJsonParse(text);
    const errorMessage =
      parsed.ok && parsed.value && typeof parsed.value === 'object' && 'error' in parsed.value
        ? (parsed.value as any)?.error?.message
        : '';

    console.error('[geminiFetch] upstream_error', {
      model,
      status: res.status,
      statusText: res.statusText,
      parseOk: parsed.ok,
      parseError: parsed.ok ? '' : (parsed.error instanceof Error ? parsed.error.message : String(parsed.error)),
      responsePreview: text.slice(0, 500),
      errorMessage: typeof errorMessage === 'string' ? errorMessage : '',
    });

    const detail = typeof errorMessage === 'string' && errorMessage.trim() ? `: ${errorMessage.trim()}` : '';
    throw new Error(`Gemini API error (${res.status})${detail}`);
  }
  return res.json();
};

const pickFirstText = (response: any) => {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find((p: any) => typeof p?.text === 'string');
  return textPart?.text || '';
};

const pickFirstImage = (response: any) => {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;
  return inlineData ? { data: inlineData.data, mimeType: inlineData.mimeType || inlineData.mime_type } : null;
};

export const generateLabelPrompt = async (input: LabelPromptInputs): Promise<GeminiPromptResult> => {
  const {
    title,
    subtitle,
    theme,
    subTheme,
    mainSubjectType,
    mainSubject,
    action,
    styleFamily,
    paletteVibe,
  } = input;

  const userPrompt = [
    'Create a concise, production-grade label prompt.',
    'Use the fields below; omit any that are empty.',
    'Return only the final prompt sentence, no quotes, no labels.',
    '',
    `Title: ${title}`,
    `Subtitle (liquid): ${subtitle}`,
    `Concept theme: ${theme || ''}`,
    `Sub-theme: ${subTheme || ''}`,
    `Main subject type: ${mainSubjectType || ''}`,
    `Main subject: ${mainSubject || ''}`,
    `Action: ${action || ''}`,
    `Style family: ${styleFamily || ''}`,
    `Palette vibe: ${paletteVibe || ''}`,
  ].join('\n');

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 256,
    },
  };

  const raw = await geminiFetch(GEMINI_TEXT_MODEL, body);
  const prompt = pickFirstText(raw).trim();
  return { prompt, raw };
};

export const generateLabelImage = async (prompt: string, options?: { aspectRatio?: string }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Add REACT_APP_GEMINI_API_KEY to .env for client-side usage.');
  }

  const aspectRatio = options?.aspectRatio || '4:5';
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['Text', 'Image'],
      imageConfig: {
        aspectRatio,
      },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;
  const startedAt = Date.now();
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('[generateLabelImage] network_error', {
      model: GEMINI_IMAGE_MODEL,
      aspectRatio,
      promptLength: prompt.length,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    });
    throw error instanceof Error ? error : new Error('Gemini image request failed.');
  }

  const responseText = await response.text();
  const parsed = safeJsonParse(responseText);
  const elapsedMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorMessage =
      parsed.ok && parsed.value && typeof parsed.value === 'object' && 'error' in parsed.value
        ? (parsed.value as any)?.error?.message
        : '';
    const requestId = response.headers.get('x-request-id') || response.headers.get('x-cloud-trace-context') || '';

    console.error('[generateLabelImage] upstream_error', {
      model: GEMINI_IMAGE_MODEL,
      aspectRatio,
      promptLength: prompt.length,
      elapsedMs,
      status: response.status,
      statusText: response.statusText,
      requestId,
      parseOk: parsed.ok,
      parseError: parsed.ok ? '' : (parsed.error instanceof Error ? parsed.error.message : String(parsed.error)),
      responsePreview: responseText.slice(0, 500),
      errorMessage: typeof errorMessage === 'string' ? errorMessage : '',
    });

    const detail = typeof errorMessage === 'string' && errorMessage ? `: ${errorMessage}` : '';
    throw new Error(`Gemini API error (${response.status})${detail}`);
  }

  if (!parsed.ok) {
    console.error('[generateLabelImage] parse_error', {
      model: GEMINI_IMAGE_MODEL,
      aspectRatio,
      promptLength: prompt.length,
      elapsedMs,
      status: response.status,
      statusText: response.statusText,
      parseError: parsed.error instanceof Error ? parsed.error.message : String(parsed.error),
      responsePreview: responseText.slice(0, 500),
    });
    throw new Error('Gemini API returned invalid JSON for image generation.');
  }

  const raw = parsed.value as any;
  const text = pickFirstText(raw).trim();
  const image = pickFirstImage(raw);
  return {
    text,
    imageBase64: image?.data,
    mimeType: image?.mimeType,
    raw,
  } as GeminiImageResult;
};
