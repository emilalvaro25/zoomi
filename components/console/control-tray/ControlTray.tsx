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
  useSettings,
  useLogStore,
  useUI,
  useCameraState,
  useParticipantStore,
} from '@/lib/state';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { VIDEO_EFFECTS } from '@/lib/constants';

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const localParticipant = useParticipantStore(state => state.localParticipant);
  const [muted, setMuted] = useState(localParticipant?.role === 'student');
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const { isFullScreen, toggleFullScreen, setShareModalOpen } = useUI();
  const { effect, setEffect } = useCameraState();
  const { setMuted: setParticipantMuted, participants, setAllMuted } =
    useParticipantStore();
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

  useEffect(() => {
    const remoteParticipants = participants.filter(p => !p.isLocal);
    if (remoteParticipants.length === 0) {
      setIsAllMuted(false);
      return;
    }
    const allRemotesMuted = remoteParticipants.every(p => p.isMuted);
    setIsAllMuted(allRemotesMuted);
  }, [participants]);

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    if (localParticipant) {
      // Muted is true if not connected or explicitly muted, or if student
      const newMutedState =
        !connected || muted || localParticipant.role === 'student';
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
    if (connected) {
      setMuted(!muted);
    }
  };

  const handleMuteAllToggle = () => {
    const newMutedState = !isAllMuted;
    setAllMuted(newMutedState);
  };

  const handleExportLogs = () => {
    const { model } = useSettings.getState();
    const { turns } = useLogStore.getState();

    const logData = {
      configuration: {
        model,
      },
      conversation: turns.map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString(),
      })),
    };

    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `live-api-logs-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConnectToggle = () => {
    if (connected) {
      disconnect();
    } else {
      connect();
      if (localParticipant?.role === 'host') {
        setMuted(false); // Unmute on connect for host
      }
    }
  };

  const micButtonTitle = connected
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
  const remoteParticipantsExist = participants.some(p => !p.isLocal);

  const isHost = localParticipant?.role === 'host';
  const isStudent = localParticipant?.role === 'student';

  return (
    <section className={cn('control-tray', { 'full-screen': isFullScreen })}>
      <nav className={cn('actions-nav')}>
        <button
          className={cn('action-button mic-button')}
          onClick={handleMicClick}
          title={micButtonTitle}
          disabled={!connected || isStudent}
        >
          {muted || isStudent ? (
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
        {isHost && (
          <button
            className={cn('action-button')}
            onClick={() => setShareModalOpen(true)}
            title="Share Invite"
          >
            <span className="material-symbols-outlined filled">share</span>
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
              onClick={handleExportLogs}
              aria-label="Export Logs"
              title="Export session logs"
            >
              <span className="icon">download</span>
            </button>
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
    </section>
  );
}

export default memo(ControlTray);
