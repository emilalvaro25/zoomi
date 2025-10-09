/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// FIX: Import React to resolve namespace issue for React.RefObject.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GenAILiveClient } from '../../lib/genai-live-client';
import { LiveConnectConfig, LiveServerToolCall } from '@google/genai';
import { AudioStreamer } from '../../lib/audio-streamer';
import { audioContext } from '../../lib/utils';
import VolMeterWorket from '../../lib/worklets/vol-meter';
import {
  useLogStore,
  useParticipantStore,
  useSettings,
  useUI,
  VideoQuality,
} from '@/lib/state';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type UseLiveApiResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;

  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;

  volume: number;

  videoEnabled: boolean;
  toggleVideo: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
};

const VIDEO_QUALITY_CONSTRAINTS: Record<VideoQuality, MediaTrackConstraints> = {
  low: {
    width: { ideal: 640 },
    height: { ideal: 360 },
    frameRate: { ideal: 15 },
  },
  medium: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  high: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  },
};

export function useLiveApi({
  apiKey,
}: {
  apiKey: string;
}): UseLiveApiResults {
  const { model, translationVolume, isTranslationEnabled, videoQuality } =
    useSettings();
  const client = useMemo(
    () => new GenAILiveClient(apiKey, model),
    [apiKey, model],
  );

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const { localParticipantUid, setCameraOff } = useParticipantStore();
  const meetingId = useUI(state => state.meetingId);

  const [volume, setVolume] = useState(0);
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConnectConfig>({});

  const [videoEnabled, setVideoEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const videoChannelRef = useRef<RealtimeChannel | null>(null);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: 'audio-out' }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>('vumeter-out', VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          })
          .catch(err => {
            console.error('Error adding worklet:', err);
          });
      });
    }
  }, [audioStreamerRef]);

  // Sync audio streamer volume with global settings
  useEffect(() => {
    if (audioStreamerRef.current) {
      audioStreamerRef.current.setVolume(
        isTranslationEnabled ? translationVolume : 0,
      );
    }
  }, [translationVolume, isTranslationEnabled]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
    };

    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop();
      }
    };

    const onAudio = (data: ArrayBuffer) => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.addPCM16(new Uint8Array(data));
      }
    };

    // Bind event listeners
    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('interrupted', stopAudioStreamer);
    client.on('audio', onAudio);

    const onToolCall = (toolCall: LiveServerToolCall) => {
      const functionResponses: any[] = [];

      for (const fc of toolCall.functionCalls) {
        // Log the function call trigger
        const triggerMessage = `Triggering function call: **${
          fc.name
        }**\n\`\`\`json\n${JSON.stringify(fc.args, null, 2)}\n\`\`\``;
        useLogStore.getState().addTurn({
          role: 'system',
          text: triggerMessage,
          isFinal: true,
        });

        // Prepare the response
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: 'ok' }, // simple, hard-coded function response
        });
      }

      // Log the function call response
      if (functionResponses.length > 0) {
        const responseMessage = `Function call response:\n\`\`\`json\n${JSON.stringify(
          functionResponses,
          null,
          2,
        )}\n\`\`\``;
        useLogStore.getState().addTurn({
          role: 'system',
          text: responseMessage,
          isFinal: true,
        });
      }

      client.sendToolResponse({ functionResponses: functionResponses });
    };

    client.on('toolcall', onToolCall);

    return () => {
      // Clean up event listeners
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('interrupted', stopAudioStreamer);
      client.off('audio', onAudio);
      client.off('toolcall', onToolCall);
    };
  }, [client]);

  // Effect to manage the Supabase channel for broadcasting video
  useEffect(() => {
    if (meetingId && !videoChannelRef.current) {
      const channel = supabase.channel(`video-stream-${meetingId}`);
      videoChannelRef.current = channel;
      channel.subscribe();
    }
    return () => {
      if (videoChannelRef.current) {
        supabase.removeChannel(videoChannelRef.current);
        videoChannelRef.current = null;
      }
    };
  }, [meetingId]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error('config has not been set');
    }
    if (audioStreamerRef.current) {
      await audioStreamerRef.current.resume();
    }
    client.disconnect();
    await client.connect(config);
  }, [client, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve((reader.result as string).split(',')[1]);
        } else {
          reject('FileReader result is null');
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  useEffect(() => {
    const startVideoStreaming = () => {
      if (!videoRef.current || frameIntervalRef.current) {
        return;
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvasEl = canvasRef.current;
      const videoEl = videoRef.current;
      const ctx = canvasEl.getContext('2d');

      if (!ctx) {
        return;
      }

      frameIntervalRef.current = window.setInterval(() => {
        if (!videoEl.videoWidth || !videoEl.videoHeight) {
          return;
        }
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
        canvasEl.toBlob(
          async blob => {
            if (blob) {
              const base64Data = await blobToBase64(blob);

              // Only send to Gemini if connected to the AI stream
              // FIX: The `session` property is protected. The `connected` state variable
              // is sufficient to check if the client is ready to send data.
              if (connected) {
                client.sendRealtimeInput([
                  {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                  },
                ]);
              }
              // Always broadcast frame to peers if video is enabled
              if (videoChannelRef.current && localParticipantUid) {
                videoChannelRef.current.send({
                  type: 'broadcast',
                  event: 'frame',
                  payload: { uid: localParticipantUid, frame: base64Data },
                });
              }
            }
          },
          'image/jpeg',
          0.5, // Lower quality to reduce payload size
        );
      }, 100); // 10 FPS
    };

    const stopVideoStreaming = () => {
      if (frameIntervalRef.current) {
        window.clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };

    if (videoEnabled) {
      startVideoStreaming();
    } else {
      stopVideoStreaming();
    }

    return () => {
      stopVideoStreaming();
    };
  }, [connected, videoEnabled, client, localParticipantUid]);

  const toggleVideo = useCallback(() => {
    setVideoEnabled(v => !v);
  }, []);

  useEffect(() => {
    if (videoEnabled) {
      let isCancelled = false;
      const constraints = { video: VIDEO_QUALITY_CONSTRAINTS[videoQuality] };

      // Stop previous tracks before getting new ones
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(stream => {
          if (!isCancelled && videoRef.current) {
            videoRef.current.srcObject = stream;
            if (localParticipantUid) {
              setCameraOff(localParticipantUid, false);
            }
          }
        })
        .catch(err => {
          console.error('Error accessing webcam:', err);
          setVideoEnabled(false); // Toggle off on error
        });

      return () => {
        isCancelled = true;
      };
    } else {
      // Turn off video
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (localParticipantUid) {
        setCameraOff(localParticipantUid, true);
      }
    }
  }, [videoEnabled, videoQuality, localParticipantUid, setCameraOff]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }
    };
  }, []);

  return {
    client,
    config,
    setConfig,
    connect,
    connected,
    disconnect,
    volume,
    videoEnabled,
    toggleVideo,
    videoRef,
  };
}
