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
    throw new Error(`Gemini API error (${res.status}): ${text}`);
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
        aspectRatio: options?.aspectRatio || '4:5',
      },
    },
  };

  const raw = await geminiFetch(GEMINI_IMAGE_MODEL, body);
  const text = pickFirstText(raw).trim();
  const image = pickFirstImage(raw);
  return {
    text,
    imageBase64: image?.data,
    mimeType: image?.mimeType,
    raw,
  } as GeminiImageResult;
};
