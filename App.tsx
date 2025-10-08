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
 * Unless required by applicable law of agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from 'classnames';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';

import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { useUI, useCameraState, useParticipantStore } from './lib/state';
import WebcamView from './components/demo/webcam-view/WebcamView';
import { useEffect } from 'react';
import ParticipantList from './components/participant-list/ParticipantList';
import JoinScreen from './components/onboarding/JoinScreen';
import SubtitleOverlay from './components/demo/subtitle-overlay/SubtitleOverlay';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/auth';
import AuthScreen from './components/onboarding/AuthScreen';

const API_KEY = process.env.API_KEY as string;
if (typeof API_KEY !== 'string') {
  throw new Error('Missing required environment variable: API_KEY');
}

/**
 * Main application component that provides a streaming interface for Live API.
 * Manages video streaming state and provides controls for webcam/screen capture.
 */
function App() {
  const { isFullScreen, setFullScreen, hasJoined } = useUI();
  const { lightType } = useCameraState();
  const {
    localParticipantId,
    setParticipants,
    addOrUpdateParticipant,
    removeParticipant,
    setLocalParticipantId,
  } = useParticipantStore();
  const { session, setSession } = useAuth();

  // Handle auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLocalParticipantId(session?.user.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLocalParticipantId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLocalParticipantId]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [setFullScreen]);

  useEffect(() => {
    if (!hasJoined || !localParticipantId) return;

    // Initial fetch of participants
    const fetchParticipants = async () => {
      const { data, error } = await supabase.from('participants').select('*');
      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }
      if (data) {
        const mappedParticipants = data.map(p => ({
          uid: p.uid,
          name: p.uid === localParticipantId ? `${p.name} (You)` : p.name,
          isMuted: p.is_muted,
          isCameraOff: p.is_camera_off,
          isLocal: p.uid === localParticipantId,
        }));
        setParticipants(mappedParticipants);
      }
    };
    fetchParticipants();

    // Set up realtime subscription
    const channel = supabase
      .channel('participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = payload.new;
            addOrUpdateParticipant({
              uid: p.uid,
              name: p.uid === localParticipantId ? `${p.name} (You)` : p.name,
              isMuted: p.is_muted,
              isCameraOff: p.is_camera_off,
              isLocal: p.uid === localParticipantId,
            });
          } else if (payload.eventType === 'DELETE') {
            removeParticipant(payload.old.uid);
          }
        },
      )
      .subscribe();

    // Clean up on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    hasJoined,
    localParticipantId,
    setParticipants,
    addOrUpdateParticipant,
    removeParticipant,
  ]);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (localParticipantId) {
        await supabase
          .from('participants')
          .delete()
          .eq('uid', localParticipantId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [localParticipantId]);

  if (!session) {
    return <AuthScreen />;
  }

  if (!hasJoined) {
    return <JoinScreen />;
  }

  return (
    <div className={cn('App', { 'full-screen': isFullScreen })}>
      <LiveAPIProvider apiKey={API_KEY}>
        <Header />
        <Sidebar />
        <ErrorScreen />
        <div className="app-layout">
          <ParticipantList />
          <div className="streaming-console">
            <main>
              <div className="main-app-area">
                <div className="webcam-container">
                  <WebcamView />
                  <div className={cn('light-overlay', lightType)}></div>
                </div>
                <SubtitleOverlay />
              </div>

              <ControlTray></ControlTray>
            </main>
          </div>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
