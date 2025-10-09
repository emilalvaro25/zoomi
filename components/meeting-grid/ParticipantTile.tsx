/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
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

  const isVideoOn = !participant.isCameraOff;
  const isSpeaking = participant.uid === speakingParticipantUid;
  const isPinned = participant.uid === pinnedParticipantUid;

  const isAboutToEndTurn =
    isSpeaking && participant.isLocal && countdown !== null;

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedParticipant(isPinned ? null : participant.uid);
  };

  const renderContent = () => {
    // Local participant uses WebcamView, which handles its own placeholder
    if (participant.isLocal) {
      return <WebcamView />;
    }

    // Remote participants use <img> for received frames
    const frameData = remoteVideoFrames[participant.uid];

    if (isVideoOn && frameData) {
      return (
        <img
          src={`data:image/jpeg;base64,${frameData}`}
          className="remote-video-frame"
          alt={`${participant.name}'s video`}
        />
      );
    }

    // Placeholder if camera is off or no frame received yet
    return (
      <div className="participant-placeholder">
        <span className="avatar-icon icon">
          {isVideoOn ? 'videocam' : 'videocam_off'}
        </span>
        {isVideoOn && (
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
        <span
          className={cn('icon', { muted: participant.isMuted })}
          title={participant.isMuted ? 'Muted' : 'Unmuted'}
        >
          {participant.isMuted ? 'mic_off' : 'mic'}
        </span>
        <span title={participant.name}>{participant.name}</span>
        {participant.role === 'host' && (
          <span className="host-badge">Host</span>
        )}
      </div>
    </div>
  );
};

export default ParticipantTile;
