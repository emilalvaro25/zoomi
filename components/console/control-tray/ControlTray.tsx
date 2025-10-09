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

import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import {
  useLogStore,
  useUI,
  useCameraState,
  useParticipantStore,
  useSettings,
} from '@/lib/state';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { VIDEO_EFFECTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const localParticipant = useParticipantStore(state => state.localParticipant);
  const [muted, setMuted] = useState(true);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const {
    isFullScreen,
    toggleFullScreen,
    setShareModalOpen,
    meetingId,
    setHasJoined,
    isSpeakerOnCooldown,
    setIsSpeakerOnCooldown,
    setCountdown,
  } = useUI();
  const { effect, setEffect } = useCameraState();
  const { isTranslationEnabled, toggleTranslation, isSyncedTranslation } =
    useSettings();
  const {
    setMuted: setParticipantMuted,
    participants,
    setAllMuted,
    speakingParticipantUid,
    setSpeakingParticipant,
    setHandRaised,
  } = useParticipantStore();
  const [showEffects, setShowEffects] = useState(false);
  const [isAllMuted, setIsAllMuted] = useState(false);

  const {
    client,
    connected,
    connect,
    disconnect,
    toggleVideo,
    videoEnabled,
  } = useLiveAPIContext();

  const speechTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  // Synced Translation Mode Effect
  useEffect(() => {
    const cleanupTimers = () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      speechTimerRef.current = null;
      countdownTimerRef.current = null;
      setCountdown(null);
    };

    if (
      !isSyncedTranslation ||
      localParticipant?.role !== 'host' ||
      !connected ||
      isSpeakerOnCooldown
    ) {
      cleanupTimers();
      return;
    }

    const isSpeaking = speakingParticipantUid === localParticipant?.uid;

    if (isSpeaking) {
      if (!speechTimerRef.current && !countdownTimerRef.current) {
        speechTimerRef.current = window.setTimeout(() => {
          let count = 5;
          setCountdown(count);
          countdownTimerRef.current = window.setInterval(() => {
            count -= 1;
            setCountdown(count > 0 ? count : null);
            if (count <= 0) {
              clearInterval(countdownTimerRef.current!);
              countdownTimerRef.current = null;
              // Force mute and start cooldown
              setMuted(true);
              setIsSpeakerOnCooldown(true);
            }
          }, 1000);
        }, 8000); // 8 second speech limit before countdown
      }
    } else {
      cleanupTimers();
    }

    return cleanupTimers;
  }, [
    speakingParticipantUid,
    localParticipant,
    connected,
    isSyncedTranslation,
    isSpeakerOnCooldown,
    setCountdown,
    setIsSpeakerOnCooldown,
  ]);

  // Speaker Detection Effect
  useEffect(() => {
    if (!connected || muted) {
      setSpeakingParticipant(null);
      return;
    }

    let speakingTimeout: number | null = null;

    const handleVolume = (volume: number) => {
      // Threshold to detect speech, adjust if necessary
      if (volume > 0.02 && localParticipant) {
        setSpeakingParticipant(localParticipant.uid);
        if (speakingTimeout) {
          clearTimeout(speakingTimeout);
        }
        speakingTimeout = window.setTimeout(() => {
          setSpeakingParticipant(null);
        }, 1500); // Keep indicator for 1.5s after speech stops
      }
    };

    audioRecorder.on('volume', handleVolume);

    return () => {
      audioRecorder.off('volume', handleVolume);
      if (speakingTimeout) {
        clearTimeout(speakingTimeout);
      }
      // Ensure the speaking state is cleared on unmount
      setSpeakingParticipant(null);
    };
  }, [
    audioRecorder,
    localParticipant,
    setSpeakingParticipant,
    connected,
    muted,
  ]);

  useEffect(() => {
    const remoteParticipants = participants.filter(
      p => p.uid !== localParticipant?.uid,
    );
    if (remoteParticipants.length === 0) {
      setIsAllMuted(false);
      return;
    }
    const allRemotesMuted = remoteParticipants.every(p => p.isMuted);
    setIsAllMuted(allRemotesMuted);
  }, [participants, localParticipant]);

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    if (localParticipant) {
      const newMutedState = !connected || muted;
      setParticipantMuted(localParticipant.uid, newMutedState);
    }
  }, [muted, connected, localParticipant, setParticipantMuted]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, muted, audioRecorder]);

  const handleMicClick = () => {
    if (connected && !isSpeakerOnCooldown) {
      setMuted(!muted);
    }
  };

  const handleMuteAllToggle = () => {
    const newMutedState = !isAllMuted;
    setAllMuted(newMutedState);
  };

  const handleEndMeeting = async () => {
    if (
      !meetingId ||
      !window.confirm('Are you sure you want to end the meeting for everyone?')
    ) {
      return;
    }
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('meeting_id', meetingId);

      if (error) throw error;

      disconnect();
      setHasJoined(false);
      // Clear meetingId from URL
      if (window.location.protocol !== 'blob:') {
        window.history.pushState({}, '', window.location.pathname);
      }
    } catch (error) {
      console.error('Failed to end meeting:', error);
      alert('Could not end the meeting. Please try again.');
    }
  };

  const handleConnectToggle = () => {
    if (connected) {
      disconnect();
      setMuted(true); // Mute on disconnect
    } else {
      connect();
      setMuted(false); // Unmute on connect
    }
  };

  const handleRaiseHandToggle = () => {
    if (localParticipant) {
      setHandRaised(localParticipant.uid, !localParticipant.isHandRaised);
    }
  };

  const micButtonTitle = isSpeakerOnCooldown
    ? 'Translating, please wait...'
    : connected
    ? muted
      ? 'Unmute microphone'
      : 'Mute microphone'
    : 'Microphone (disconnected)';

  const connectButtonTitle = connected ? 'Stop streaming' : 'Start streaming';
  const videoButtonTitle = videoEnabled ? 'Turn off camera' : 'Turn on camera';
  const fullScreenButtonTitle = isFullScreen
    ? 'Exit full screen'
    : 'Enter full screen';
  const muteAllButtonTitle = isAllMuted
    ? 'Unmute all participants'
    : 'Mute all participants';
  const raiseHandButtonTitle = localParticipant?.isHandRaised
    ? 'Lower hand'
    : 'Raise hand';
  const translationButtonTitle = isTranslationEnabled
    ? 'Disable translation audio'
    : 'Enable translation audio';

  const remoteParticipantsExist = participants.some(
    p => p.uid !== localParticipant?.uid,
  );

  const isHost = localParticipant?.role === 'host';

  return (
    <section className={cn('control-tray', { 'full-screen': isFullScreen })}>
      <nav className={cn('actions-nav')}>
        <button
          className={cn('action-button mic-button')}
          onClick={handleMicClick}
          title={micButtonTitle}
          disabled={!connected || isSpeakerOnCooldown}
        >
          {muted ? (
            <span className="material-symbols-outlined filled">mic_off</span>
          ) : (
            <span className="material-symbols-outlined filled">mic</span>
          )}
        </button>
        <button
          className={cn('action-button', { 'video-enabled': videoEnabled })}
          onClick={toggleVideo}
          title={videoButtonTitle}
        >
          <span className="material-symbols-outlined filled">
            {videoEnabled ? 'videocam' : 'videocam_off'}
          </span>
        </button>
        <button
          className={cn('action-button', {
            active: localParticipant?.isHandRaised,
          })}
          onClick={handleRaiseHandToggle}
          title={raiseHandButtonTitle}
        >
          <span className="material-symbols-outlined filled">front_hand</span>
        </button>
        <button
          className={cn('action-button', { active: isTranslationEnabled })}
          onClick={toggleTranslation}
          title={translationButtonTitle}
        >
          <span className="material-symbols-outlined filled">translate</span>
        </button>
        {isHost && (
          <button
            className={cn('action-button')}
            onClick={() => setShareModalOpen(true)}
            title="Invite Participants"
          >
            <span className="material-symbols-outlined filled">person_add</span>
          </button>
        )}
        {isHost && remoteParticipantsExist && (
          <button
            className={cn('action-button')}
            onClick={handleMuteAllToggle}
            title={muteAllButtonTitle}
            disabled={!connected}
          >
            {isAllMuted ? (
              <span className="material-symbols-outlined filled">
                record_voice_over
              </span>
            ) : (
              <span className="material-symbols-outlined filled">
                voice_over_off
              </span>
            )}
          </button>
        )}
        <div className="control-group">
          <button
            className={cn('action-button', { active: showEffects })}
            onClick={() => setShowEffects(!showEffects)}
            title="Video Effects"
          >
            <span className="material-symbols-outlined filled">
              auto_awesome
            </span>
          </button>
          <span className="control-indicator">{effect}</span>
          {showEffects && (
            <div className="effects-popover">
              {VIDEO_EFFECTS.map(fx => (
                <button
                  key={fx}
                  onClick={() => {
                    setEffect(fx);
                    setShowEffects(false);
                  }}
                >
                  {fx}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={cn('action-button')}
          onClick={toggleFullScreen}
          title={fullScreenButtonTitle}
        >
          <span className="material-symbols-outlined filled">
            {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
        {isHost && (
          <>
            <button
              className={cn('action-button')}
              onClick={useLogStore.getState().clearTurns}
              aria-label="Reset Chat"
              title="Reset session logs"
            >
              <span className="icon">refresh</span>
            </button>
          </>
        )}
        {children}
      </nav>

      <div className={cn('connection-container', { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn('action-button connect-toggle', { connected })}
            onClick={handleConnectToggle}
            title={connectButtonTitle}
          >
            <span className="material-symbols-outlined filled">
              {connected ? 'pause' : 'play_arrow'}
            </span>
          </button>
        </div>
        <span className="text-indicator">Streaming</span>
      </div>

      {isHost && connected && (
        <button
          className="action-button end-meeting-button"
          onClick={handleEndMeeting}
          title="End Meeting for All"
        >
          <span className="material-symbols-outlined filled">call_end</span>
        </button>
      )}
    </section>
  );
}

export default memo(ControlTray);
