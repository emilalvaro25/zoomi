/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, LiveCallbacks, LiveServerMessage, Modality, Session } from '@google/genai';
import { AudioStreamer } from './audio-streamer';
import { audioContext, base64ToArrayBuffer } from './utils';
import { useSettings } from './state';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('Missing required environment variable: API_KEY');
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

let ttsSession: Session | null = null;
let audioStreamer: AudioStreamer | null = null;
let isBusy = false;
const textQueue: string[] = [];

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

async function synthesize(text: string) {
  const streamer = await getAudioStreamer();
  await streamer.resume(); // Ensure context is running

  // Use the streamer's onComplete callback to drive the queue.
  // This ensures the next chunk starts after the previous one finishes playing.
  streamer.onComplete = () => {
    if (isBusy) {
      isBusy = false;
      processQueue();
    }
  };

  const { voice, translationVolume } = useSettings.getState();
  streamer.setVolume(translationVolume);

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
      // If an error occurs, move to the next item
      if (isBusy) {
        isBusy = false;
        processQueue();
      }
    },
    onclose: () => {
      ttsSession = null;
      // This callback just cleans up the session reference.
      // The onComplete callback is now responsible for processing the next item.
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
    console.error('Failed to connect TTS session:', error);
    if (isBusy) {
      isBusy = false;
      processQueue();
    }
  }
}
