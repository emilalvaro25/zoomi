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
  useTools,
  useLogStore,
  useUI,
  useCameraState,
  ZOOM_LEVELS,
  LIGHT_TYPES,
} from '@/lib/state';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const { isFullScreen, toggleFullScreen } = useUI();
  const { zoom, lightType, setZoom, setLightType } = useCameraState();

  const {
    client,
    connected,
    connect,
    disconnect,
    toggleVideo,
    videoEnabled,
  } = useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

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
    } else {
      connect();
    }
  };

  const handleExportLogs = () => {
    const { systemPrompt, model } = useSettings.getState();
    const { tools } = useTools.getState();
    const { turns } = useLogStore.getState();

    const logData = {
      configuration: {
        model,
        systemPrompt,
      },
      tools,
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

  const cycleZoom = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    const nextIndex = (currentIndex + 1) % ZOOM_LEVELS.length;
    setZoom(ZOOM_LEVELS[nextIndex]);
  };

  const cycleLight = () => {
    const currentIndex = LIGHT_TYPES.indexOf(lightType);
    const nextIndex = (currentIndex + 1) % LIGHT_TYPES.length;
    setLightType(LIGHT_TYPES[nextIndex]);
  };

  const micButtonTitle = connected
    ? muted
      ? 'Unmute microphone'
      : 'Mute microphone'
    : 'Connect and start microphone';

  const connectButtonTitle = connected ? 'Stop streaming' : 'Start streaming';
  const videoButtonTitle = videoEnabled ? 'Turn off camera' : 'Turn on camera';
  const fullScreenButtonTitle = isFullScreen
    ? 'Exit full screen'
    : 'Enter full screen';

  return (
    <section className={cn('control-tray', { 'full-screen': isFullScreen })}>
      <nav className={cn('actions-nav')}>
        <button
          className={cn('action-button mic-button')}
          onClick={handleMicClick}
          title={micButtonTitle}
        >
          {!muted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
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
        <div className="control-group">
          <button
            className={cn('action-button')}
            onClick={cycleZoom}
            title="Cycle camera zoom"
          >
            <span className="material-symbols-outlined filled">zoom_in</span>
          </button>
          <span className="control-indicator">{zoom.toFixed(2)}x</span>
        </div>
        <div className="control-group">
          <button
            className={cn('action-button')}
            onClick={cycleLight}
            title="Cycle light type"
          >
            <span className="material-symbols-outlined filled">lightbulb</span>
          </button>
          <span className="control-indicator">{lightType}</span>
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
        {children}
      </nav>

      <div className={cn('connection-container', { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn('action-button connect-toggle', { connected })}
            onClick={connected ? disconnect : connect}
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
