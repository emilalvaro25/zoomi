/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import { Participant, useParticipantStore, useUI } from '@/lib/state';
import WebcamView from '../demo/webcam-view/WebcamView';
import './ParticipantTile.css';
import cn from 'classnames';

interface ParticipantTileProps {
  participant: Participant;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({ participant }) => {
  const {
    speakingParticipantUid,
    pinnedParticipantUid,
    setPinnedParticipant,
    remoteVideoFrames,
  } = useParticipantStore();
  const { countdown } = useUI();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameData = remoteVideoFrames[participant.uid];

  const isVideoOn = !participant.isCameraOff || participant.isScreenSharing;
  const isSpeaking = participant.uid === speakingParticipantUid;
  const isPinned = participant.uid === pinnedParticipantUid;

  const isAboutToEndTurn =
    isSpeaking && participant.isLocal && countdown !== null;

  useEffect(() => {
    if (participant.isLocal || !frameData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const image = new Image();
    image.src = `data:image/jpeg;base64,${frameData}`;
    image.onload = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);

      context.save();

      // Handle mirroring for non-screenshare video
      if (!participant.isScreenSharing) {
        context.scale(-1, 1);
        context.translate(-canvas.width, 0);
      }

      // Handle object-fit (cover vs contain)
      const hRatio = canvas.width / image.width;
      const vRatio = canvas.height / image.height;
      const ratio = participant.isScreenSharing
        ? Math.min(hRatio, vRatio) // contain
        : Math.max(hRatio, vRatio); // cover

      const centerShiftX = (canvas.width - image.width * ratio) / 2;
      const centerShiftY = (canvas.height - image.height * ratio) / 2;

      context.drawImage(
        image,
        0,
        0,
        image.width,
        image.height,
        centerShiftX,
        centerShiftY,
        image.width * ratio,
        image.height * ratio,
      );

      context.restore();
    };
  }, [frameData, participant.isLocal, participant.isScreenSharing]);

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedParticipant(isPinned ? null : participant.uid);
  };

  const renderContent = () => {
    // Local participant uses WebcamView, which handles its own placeholder
    if (participant.isLocal) {
      return <WebcamView />;
    }

    // Remote participants use <canvas> for received frames
    if (isVideoOn) {
      return <canvas ref={canvasRef} className="remote-video-canvas" />;
    }

    // Placeholder if camera is off
    return (
      <div className="participant-placeholder">
        <span className="avatar-icon icon">
          {participant.isScreenSharing
            ? 'screen_share'
            : isVideoOn
            ? 'videocam'
            : 'videocam_off'}
        </span>
        {!participant.isCameraOff && !participant.isScreenSharing && (
          <p className="placeholder-text">Waiting for video...</p>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn('participant-tile', {
        'is-speaking': isSpeaking && !isAboutToEndTurn,
        'is-speaking-ending-turn': isAboutToEndTurn,
        'is-pinned': isPinned,
        'is-screen-sharing': participant.isScreenSharing,
      })}
    >
      {participant.isHandRaised && (
        <div className="hand-raised-overlay" title="Hand raised">
          <span className="icon">front_hand</span>
        </div>
      )}

      <button
        className="pin-button"
        onClick={handlePinClick}
        title={isPinned ? 'Unpin participant' : 'Pin participant'}
      >
        <span className="icon">push_pin</span>
      </button>

      {renderContent()}

      <div className="participant-name-overlay">
        {participant.isScreenSharing ? (
          <span className="icon" title="Screen sharing">
            screen_share
          </span>
        ) : (
          <span
            className={cn('icon', { muted: participant.isMuted })}
            title={participant.isMuted ? 'Muted' : 'Unmuted'}
          >
            {participant.isMuted ? 'mic_off' : 'mic'}
          </span>
        )}
        <span title={participant.name}>{participant.name}</span>
        {participant.role === 'host' && (
          <span className="host-badge">Host</span>
        )}
      </div>
    </div>
  );
};

export default ParticipantTile;
