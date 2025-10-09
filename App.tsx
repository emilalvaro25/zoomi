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
import { useUI, useParticipantStore } from './lib/state';
import { useEffect, useState } from 'react';
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

const API_KEY = process.env.API_KEY as string;
if (typeof API_KEY !== 'string') {
  throw new Error('Missing required environment variable: API_KEY');
}

function AppContent() {
  const {
    isFullScreen,
    setFullScreen,
    hasJoined,
    isParticipantListOpen,
    isShareModalOpen,
    setShareModalOpen,
  } = useUI();
  const {
    localParticipant,
    setParticipants,
    addOrUpdateParticipant,
    removeParticipant,
  } = useParticipantStore();
  const meetingId = useUI(state => state.meetingId);

  const [activeSubtitle, setActiveSubtitle] = useState({
    text: '',
    isFinal: false,
  });

  const { client } = useLiveAPIContext();

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
  ]);

  // Handle sending own transcription to DB for all participants
  useEffect(() => {
    if (!hasJoined || !localParticipant?.uid) return;

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
      }
    };

    client.on('inputTranscription', handleInputTranscription);
    return () => {
      client.off('inputTranscription', handleInputTranscription);
    };
  }, [client, hasJoined, localParticipant, meetingId]);

  // Handle receiving remote transcriptions for translation
  useEffect(() => {
    if (!hasJoined || !localParticipant?.language) {
      return;
    }

    const speak = (text: string) => {
      // Cancel any previous speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      // Find a voice that matches the user's language if possible
      const voices = window.speechSynthesis.getVoices();
      const studentLang = localParticipant.language?.split(' ')[0].toLowerCase();
      const voice = voices.find(v =>
        v.lang.toLowerCase().startsWith(studentLang),
      );
      if (voice) {
        utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const handleRemoteMessage = async (text: string, isFinal: boolean) => {
      if (!localParticipant.language || !text.trim()) return;
      try {
        const translated = await translateText(text, localParticipant.language);
        setActiveSubtitle({ text: translated, isFinal });
        if (isFinal) {
          speak(translated);
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
            handleRemoteMessage(message.text, message.is_final);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasJoined, localParticipant, meetingId]);

  // Graceful disconnect
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (localParticipant?.uid) {
        await supabase
          .from('participants')
          .delete()
          .eq('uid', localParticipant.uid);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [localParticipant?.uid]);

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
