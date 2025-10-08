import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('Missing required environment variable: API_KEY');
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Translates a given text to a target language using the Gemini API.
 * @param text The text to translate.
 * @param targetLanguage The language to translate the text into.
 * @returns A promise that resolves to the translated text.
 */
export async function translateText(
  text: string,
  targetLanguage: string,
): Promise<string> {
  if (!text.trim()) {
    return '';
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following text to ${targetLanguage}: "${text}"`,
      config: {
        systemInstruction:
          'You are a direct translator. Do not add any extra commentary, greetings, or explanations. Provide only the direct translation of the given text.',
      },
    });

    return response.text.trim();
  } catch (error) {
    console.error('Gemini translation API call failed:', error);
    throw error;
  }
}
