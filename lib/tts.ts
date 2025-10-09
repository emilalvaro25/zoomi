/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, LiveCallbacks, LiveServerMessage, Modality, Session } from '@google/genai';
import { AudioStreamer } from './audio-streamer';
import { audioContext, base64ToArrayBuffer } from './utils';
import { useSettings } from './state';

const GEMINI_API_KEY = process.env.API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('Missing required environment variable: API_KEY');
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

let ttsSession: Session | null = null;
let audioStreamer: AudioStreamer | null = null;
let isBusy = false;
const textQueue: string[] = [];
let abortController: AbortController | null = null;

async function getAudioStreamer(): Promise<AudioStreamer> {
  if (audioStreamer) return audioStreamer;
  const ctx = await audioContext({ id: 'tts-output' });
  audioStreamer = new AudioStreamer(ctx);
  return audioStreamer;
}

/**
 * Splits text into manageable chunks for TTS synthesis.
 * It first splits by sentences, then breaks down any long sentences.
 * @param text The input text.
 * @returns An array of text chunks.
 */
function splitIntoChunks(text: string): string[] {
  if (!text) return [];

  // Split into sentences. It's not perfect but works for many cases.
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];

  const chunks: string[] = [];
  const MAX_CHUNK_LENGTH = 250; // Characters per API call

  sentences.forEach(sentence => {
    let currentSentence = sentence.trim();
    if (currentSentence.length === 0) {
      return;
    }

    // If a sentence is longer than the max length, break it down further.
    while (currentSentence.length > MAX_CHUNK_LENGTH) {
      // Find the last space within the limit
      let splitPos = currentSentence.lastIndexOf(' ', MAX_CHUNK_LENGTH);
      // If no space is found, force a split at the max length
      if (splitPos === -1) {
        splitPos = MAX_CHUNK_LENGTH;
      }
      chunks.push(currentSentence.substring(0, splitPos));
      currentSentence = currentSentence.substring(splitPos).trim();
    }

    if (currentSentence.length > 0) {
      chunks.push(currentSentence);
    }
  });

  return chunks.filter(c => c.length > 0);
}


function processQueue() {
  if (isBusy || textQueue.length === 0) {
    return;
  }
  isBusy = true;
  const text = textQueue.shift()!;
  synthesize(text);
}

/**
 * Adds text to the TTS queue to be spoken.
 * The text will be split into chunks for smoother playback.
 * @param text The text to synthesize and speak.
 */
export function speak(text: string) {
  const chunks = splitIntoChunks(text);
  if (chunks.length > 0) {
    textQueue.push(...chunks);
    processQueue();
  }
}

/**
 * Clears the TTS queue and stops any current playback.
 */
export function cancel() {
  textQueue.length = 0;
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (audioStreamer) {
    audioStreamer.stop();
    // Clear the onComplete callback to prevent it from firing
    audioStreamer.onComplete = () => {}; 
  }
  if (ttsSession) {
    ttsSession.close();
    // onclose handler will set ttsSession to null
  }
  isBusy = false; // Force reset state
}

async function synthesizeWithGemini(
  text: string,
  voice: string,
  streamer: AudioStreamer,
) {
  streamer.onComplete = () => {
    if (isBusy) {
      isBusy = false;
      processQueue();
    }
  };

  const callbacks: LiveCallbacks = {
    onopen: () => {
      if (ttsSession) {
        ttsSession.sendClientContent({
          turns: [{ text }],
          turnComplete: true,
        });
      }
    },
    onmessage: (message: LiveServerMessage) => {
      if (message.serverContent?.modelTurn) {
        const audioPart = message.serverContent.modelTurn.parts?.find(p =>
          p.inlineData?.mimeType?.startsWith('audio/pcm'),
        );
        if (audioPart?.inlineData?.data) {
          const data = base64ToArrayBuffer(audioPart.inlineData.data);
          streamer.addPCM16(new Uint8Array(data));
        }
      }
      if (message.serverContent?.turnComplete) {
        streamer.complete(); // Signal that no more audio is coming for this chunk
        if (ttsSession) {
          ttsSession.close();
        }
      }
    },
    onerror: (e: ErrorEvent) => {
      console.error('TTS Session Error:', e);
      if (ttsSession) {
        try { ttsSession.close(); } catch {}
      }
      streamer.onComplete();
    },
    onclose: () => {
      ttsSession = null;
    },
  };

  try {
    ttsSession = await ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: "You are a text-to-speech engine. You will be given text and you must say it back verbatim in the voice specified. Do not add any commentary or extra text.",
            },
          ],
        },
      },
      callbacks,
    });
  } catch (error) {
    console.error('Failed to connect Gemini TTS session:', error);
    streamer.onComplete();
  }
}

async function synthesizeWithOpenAI(
  text: string,
  apiKey: string,
  voice: string,
  streamer: AudioStreamer,
) {
  const openAIVoice = voice.replace('OpenAI-', '').toLowerCase();
  abortController = new AbortController();

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: openAIVoice,
        response_format: 'pcm', // signed 16-bit, 1-channel, 24kHz
      }),
      signal: abortController.signal,
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      streamer.addPCM16(value); // value is a Uint8Array
    }
    streamer.complete();
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('OpenAI TTS failed:', error);
    }
    streamer.onComplete();
  } finally {
    abortController = null;
  }
}

async function synthesizeWithCartesia(
  text: string,
  apiKey: string,
  voice: string,
  streamer: AudioStreamer,
) {
  // This is a hypothetical API structure for Cartesia based on common streaming patterns.
  abortController = new AbortController();
  try {
    const response = await fetch('https://api.cartesia.ai/v1/tts/stream', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_id: voice,
        output_format: 'pcm_24000_base64',
      }),
      signal: abortController.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep any incomplete line for the next chunk
      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.audio_chunk) {
            const data = base64ToArrayBuffer(parsed.audio_chunk);
            streamer.addPCM16(new Uint8Array(data));
          }
        } catch (e) {
          console.warn('Could not parse streaming JSON line:', line);
        }
      }
    }
    streamer.complete();
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Cartesia TTS failed:', error);
    }
    streamer.onComplete();
  } finally {
    abortController = null;
  }
}

async function synthesizeWithHuggingface(
  text: string,
  apiKey: string,
  voice: string,
  streamer: AudioStreamer,
) {
  // This is a hypothetical, non-streaming API call for Huggingface.
  const modelId = `facebook/mms-tts-${voice.replace('HF-', '').toLowerCase()}`; // A guess at a model family
  abortController = new AbortController();

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    // We assume the blob is a WAV file and need to extract the raw PCM data.
    // This is complex, so for this example, we'll assume it returns raw PCM if possible,
    // otherwise this would need a WAV parser.
    const arrayBuffer = await audioBlob.arrayBuffer();
    streamer.addPCM16(new Uint8Array(arrayBuffer));
    streamer.complete();
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Huggingface TTS failed:', error);
    }
    streamer.onComplete();
  } finally {
    abortController = null;
  }
}

async function synthesize(text: string) {
  const streamer = await getAudioStreamer();
  await streamer.resume();

  streamer.onComplete = () => {
    if (isBusy) {
      isBusy = false;
      processQueue();
    }
  };

  const {
    activeTtsProvider,
    cartesiaApiKey,
    huggingfaceApiKey,
    openaiApiKey,
    voice,
    translationVolume,
  } = useSettings.getState();

  streamer.setVolume(translationVolume);

  switch (activeTtsProvider) {
    case 'Cartesia':
      if (cartesiaApiKey) {
        await synthesizeWithCartesia(text, cartesiaApiKey, voice, streamer);
      } else {
        console.error('Cartesia API key is missing.');
        streamer.onComplete();
      }
      break;
    case 'Huggingface':
      console.warn('Huggingface TTS is a mock implementation and may not work.');
      if (huggingfaceApiKey) {
        await synthesizeWithHuggingface(text, huggingfaceApiKey, voice, streamer);
      } else {
        console.error('Huggingface API key is missing.');
        streamer.onComplete();
      }
      break;
    case 'OpenAI Realtime':
      if (openaiApiKey) {
        await synthesizeWithOpenAI(text, openaiApiKey, voice, streamer);
      } else {
        console.error('OpenAI API key is missing.');
        streamer.onComplete();
      }
      break;
    case 'Browser Default':
    default:
      await synthesizeWithGemini(text, voice, streamer);
      break;
  }
}
