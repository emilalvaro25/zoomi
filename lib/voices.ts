/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Mocking API calls to fetch voices from different providers.
// In a real application, these would make network requests.

export const GEMINI_VOICES = [
  'Achernar',
  'Achird',
  'Algenib',
  'Algieba',
  'Alnilam',
  'Aoede',
  'Autonoe',
  'Callirrhoe',
  'Charon',
  'Despina',
  'Enceladus',
  'Erinome',
  'Fenrir',
  'Gacrux',
  'Kore',
  'Laomedeia',
  'Leda',
  'Luna',
  'Nova',
  'Orus',
  'Puck',
  'Pulcherrima',
  'Rasalgethi',
  'Sadachbia',
  'Sadaltager',
  'Schedar',
  'Sulafat',
  'Umbriel',
  'Vindemiatrix',
  'Zephyr',
  'Zubenelgenubi',
].sort();

export const CARTESIA_VOICES = [
  'Cartesia-Llama',
  'Cartesia-Falcon',
  'Cartesia-Mistral',
];
export const HUGGINGFACE_VOICES = ['HF-Gemma', 'HF-Starling', 'HF-Zephyr'];
export const OPENAI_VOICES = [
  'OpenAI-Alloy',
  'OpenAI-Echo',
  'OpenAI-Fable',
  'OpenAI-Onyx',
  'OpenAI-Nova',
  'OpenAI-Shimmer',
];

// Simulates fetching voices if an API key is provided.
export async function fetchCartesiaVoices(apiKey: string): Promise<string[]> {
  if (!apiKey) return [];
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
  return CARTESIA_VOICES;
}

export async function fetchHuggingfaceVoices(apiKey: string): Promise<string[]> {
  if (!apiKey) return [];
  await new Promise(resolve => setTimeout(resolve, 300));
  return HUGGINGFACE_VOICES;
}

export async function fetchOpenAIVoices(apiKey: string): Promise<string[]> {
  if (!apiKey) return [];
  await new Promise(resolve => setTimeout(resolve, 300));
  return OPENAI_VOICES;
}

export function getInitialVoices(): string[] {
  return [
    ...GEMINI_VOICES,
    ...CARTESIA_VOICES,
    ...HUGGINGFACE_VOICES,
    ...OPENAI_VOICES,
  ].sort();
}
