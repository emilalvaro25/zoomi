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
 * @param text The text to synthesize and speak.
 */
export function speak(text: string) {
  textQueue.push(text);
  processQueue();
}

/**
 * Clears the TTS queue and stops any current playback.
 */
export function cancel() {
  textQueue.length = 0;
  if (audioStreamer) {
    audioStreamer.stop();
  }
  if (ttsSession) {
    ttsSession.close();
    // onclose handler will reset state
  } else {
    // If there's no session, we can safely reset busy state
    isBusy = false;
  }
}

async function synthesize(text: string) {
  const streamer = await getAudioStreamer();
  await streamer.resume(); // Ensure context is running

  const { voice, translationVolume } = useSettings.getState();
  streamer.setVolume(translationVolume);

  const callbacks: LiveCallbacks = {
    onopen: () => {
      ttsSession?.sendClientContent({
        turns: [{ text }],
        turnComplete: true,
      });
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
        streamer.complete();
        ttsSession?.close();
      }
    },
    onerror: (e: ErrorEvent) => {
      console.error('TTS Session Error:', e);
      ttsSession = null;
      isBusy = false;
      processQueue(); // Try next item in queue
    },
    onclose: () => {
      ttsSession = null;
      isBusy = false;
      processQueue(); // Try next item in queue
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
    isBusy = false;
    processQueue();
  }
}