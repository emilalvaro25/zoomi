/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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

import cn from 'classnames';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';

import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { useUI, useParticipantStore, useSettings } from './lib/state';
import { useEffect, useState, useRef } from 'react';
import ParticipantList from './components/participant-list/ParticipantList';
import JoinScreen from './components/onboarding/JoinScreen';
import SubtitleOverlay from './components/demo/subtitle-overlay/SubtitleOverlay';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { supabase } from './lib/supabase';
import MeetingGrid from './components/meeting-grid/MeetingGrid';
import { translateText } from './lib/gemini';
import { useLiveAPIContext } from './contexts/LiveAPIContext';
import ShareLinkModal from './components/onboarding/ShareLinkModal';
import { useAuth } from './lib/auth';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';
import { cancel as cancelTTS, speak as speakWithTTS } from './lib/tts';
import SyncIndicator from './components/sync-indicator/SyncIndicator';

const API_KEY = process.env.API_KEY as string;
if (typeof API_KEY !== 'string') {
  throw new Error('Missing required environment variable: API_KEY');
}

function AppContent() {
  const { session, setSession } = useAuth();
  const {
    isFullScreen,
    setFullScreen,
    hasJoined,
    setHasJoined,
    isParticipantListOpen,
    isShareModalOpen,
    setShareModalOpen,
    setMeetingId,
    setIsSpeakerOnCooldown,
  } = useUI();
  const {
    localParticipant,
    setParticipants,
    addOrUpdateParticipant,
    removeParticipant,
    setLocalParticipantUid,
    setRemoteVideoFrame,
    clearRemoteVideoFrame,
    setSpeakingParticipant,
  } = useParticipantStore();
  const meetingId = useUI(state => state.meetingId);
  const { isTranslationEnabled, translationMode, isSyncedTranslation } =
    useSettings();

  const [activeSubtitle, setActiveSubtitle] = useState({
    text: '',
    isFinal: false,
  });

  const { client } = useLiveAPIContext();
  const remoteSpeakerTimerRef = useRef<number | null>(null);

  // Handle auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setHasJoined(false);
        setMeetingId(null);
        setParticipants([]);
        setLocalParticipantUid(null);
        if (window.location.protocol !== 'blob:') {
          window.history.pushState({}, '', window.location.pathname);
        }
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [
    setSession,
    setHasJoined,
    setMeetingId,
    setParticipants,
    setLocalParticipantUid,
  ]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [setFullScreen]);

  // Handle participant subscriptions
  useEffect(() => {
    if (!hasJoined || !meetingId || !localParticipant?.uid) return;

    // Initial fetch of participants
    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('meeting_id', meetingId);

      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }
      if (data) {
        const mappedParticipants = data.map(p => ({
          uid: p.uid,
          name:
            p.uid === localParticipant.uid ? `${p.name} (You)` : p.name,
          isMuted: p.is_muted,
          isCameraOff: p.is_camera_off,
          isHandRaised: p.is_hand_raised,
          isLocal: p.uid === localParticipant.uid,
          role: p.role,
          language: p.language,
        }));
        setParticipants(mappedParticipants);
      }
    };
    fetchParticipants();

    // Set up realtime subscription
    const channel = supabase
      .channel(`participants-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `meeting_id=eq.${meetingId}`,
        },
        payload => {
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'UPDATE'
          ) {
            const p = payload.new;
            if (p.is_camera_off) {
              clearRemoteVideoFrame(p.uid);
            }
            addOrUpdateParticipant({
              uid: p.uid,
              name:
                p.uid === localParticipant.uid ? `${p.name} (You)` : p.name,
              isMuted: p.is_muted,
              isCameraOff: p.is_camera_off,
              isHandRaised: p.is_hand_raised,
              role: p.role,
              language: p.language,
            });
          } else if (payload.eventType === 'DELETE') {
            removeParticipant(payload.old.uid);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    hasJoined,
    meetingId,
    localParticipant?.uid,
    setParticipants,
    addOrUpdateParticipant,
    removeParticipant,
    clearRemoteVideoFrame,
  ]);

  // Handle video stream broadcast
  useEffect(() => {
    if (!meetingId) return;
    const videoChannel = supabase.channel(`video-stream-${meetingId}`);
    videoChannel
      .on('broadcast', { event: 'frame' }, ({ payload }) => {
        // Don't need to render our own stream this way
        if (payload.uid !== localParticipant?.uid) {
          setRemoteVideoFrame(payload.uid, payload.frame);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(videoChannel);
    };
  }, [meetingId, localParticipant?.uid, setRemoteVideoFrame]);

  // Handle sending own transcription to DB for all participants
  useEffect(() => {
    if (
      !hasJoined ||
      !localParticipant?.uid ||
      (translationMode !== 'outgoing' && translationMode !== 'bidirectional')
    ) {
      return;
    }

    let lastMessageId: string | null = null;
    const handleInputTranscription = async (text: string, isFinal: boolean) => {
      if (!meetingId || !localParticipant.uid || !text.trim()) return;

      const messagePayload = {
        meeting_id: meetingId,
        participant_id: localParticipant.uid,
        text,
        is_final: isFinal,
        source_language: localParticipant.language || 'English',
      };

      if (lastMessageId && !isFinal) {
        // Update interim message
        await supabase
          .from('messages')
          .update({ text })
          .eq('id', lastMessageId);
      } else if (isFinal || !lastMessageId) {
        // Insert new message
        const { data } = await supabase
          .from('messages')
          .insert(messagePayload)
          .select('id')
          .single();
        if (data) {
          lastMessageId = data.id;
        }
      }
      if (isFinal) {
        lastMessageId = null;
        // Cooldown logic for synced translation mode
        if (
          isSyncedTranslation &&
          localParticipant?.role === 'host' &&
          text.trim()
        ) {
          const remoteParticipants = useParticipantStore
            .getState()
            .participants.filter(p => !p.isLocal);
          // Estimate based on first remote participant's language
          const targetLanguage = remoteParticipants[0]?.language || 'Spanish';

          try {
            const translatedText = await translateText(text, targetLanguage);
            // Estimate duration: ~15 chars/sec audio playback
            const estimatedDurationMs = (translatedText.length / 15) * 1000;
            const minimumCooldown = 2000; // 2s minimum
            const cooldown = Math.max(estimatedDurationMs, minimumCooldown);

            setTimeout(() => {
              setIsSpeakerOnCooldown(false);
            }, cooldown);
          } catch (e) {
            console.error(
              'Cooldown translation failed, ending cooldown early.',
              e,
            );
            setIsSpeakerOnCooldown(false);
          }
        }
      }
    };

    client.on('inputTranscription', handleInputTranscription);
    return () => {
      client.off('inputTranscription', handleInputTranscription);
    };
  }, [
    client,
    hasJoined,
    localParticipant,
    meetingId,
    translationMode,
    isSyncedTranslation,
    setIsSpeakerOnCooldown,
  ]);

  // Handle receiving remote transcriptions for translation
  useEffect(() => {
    if (
      !hasJoined ||
      !localParticipant?.language ||
      (translationMode !== 'incoming' && translationMode !== 'bidirectional')
    ) {
      return;
    }

    const handleRemoteMessage = async (text: string, isFinal: boolean) => {
      if (!localParticipant.language || !text.trim()) return;
      try {
        const translated = await translateText(text, localParticipant.language);
        setActiveSubtitle({ text: translated, isFinal });
        if (isFinal && isTranslationEnabled) {
          speakWithTTS(translated);
        }
      } catch (error) {
        console.error('Translation error:', error);
      }
    };

    const channel = supabase
      .channel(`messages-${meetingId}-all`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `meeting_id=eq.${meetingId}`,
        },
        async payload => {
          const message = payload.new as {
            text: string;
            is_final: boolean;
            participant_id: string;
          };
          // Don't process our own messages or chat messages
          if (message && message.participant_id !== localParticipant.uid) {
            setSpeakingParticipant(message.participant_id);
            if (remoteSpeakerTimerRef.current) {
              clearTimeout(remoteSpeakerTimerRef.current);
            }
            remoteSpeakerTimerRef.current = window.setTimeout(() => {
              // Avoid clearing if another speaker started talking
              if (
                useParticipantStore.getState().speakingParticipantUid ===
                message.participant_id
              ) {
                setSpeakingParticipant(null);
              }
            }, 2500); // 2.5s indicator
            handleRemoteMessage(message.text, message.is_final);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      cancelTTS();
    };
  }, [
    hasJoined,
    localParticipant,
    meetingId,
    isTranslationEnabled,
    translationMode,
    setSpeakingParticipant,
  ]);

  // Graceful disconnect
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (localParticipant?.uid && meetingId) {
        await supabase
          .from('participants')
          .delete()
          .eq('uid', localParticipant.uid)
          .eq('meeting_id', meetingId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [localParticipant?.uid, meetingId]);

  if (!hasJoined) {
    return <JoinScreen />;
  }

  return (
    <div className={cn('App', { 'full-screen': isFullScreen })}>
      {isShareModalOpen && (
        <ShareLinkModal onClose={() => setShareModalOpen(false)} />
      )}
      <Header />
      <Sidebar />
      <ErrorScreen />
      <SyncIndicator />
      <div className="app-layout">
        <ParticipantList className={cn({ open: isParticipantListOpen })} />
        <div className="streaming-console">
          <main>
            <div className="main-app-area">
              <MeetingGrid />
              <SubtitleOverlay
                text={activeSubtitle.text}
                isFinal={activeSubtitle.isFinal}
              />
            </div>
            <ControlTray />
          </main>
          <StreamingConsole />
        </div>
      </div>
    </div>
  );
}

/**
 * Main application component that provides a streaming interface for Live API.
 * Manages video streaming state and provides controls for webcam/screen capture.
 */
export default function App() {
  return (
    <LiveAPIProvider apiKey={API_KEY}>
      <AppContent />
    </LiveAPIProvider>
  );
}
