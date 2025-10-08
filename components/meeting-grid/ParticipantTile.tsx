/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Participant, useParticipantStore } from '@/lib/state';
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
  } = useParticipantStore();

  const isVideoOn = !participant.isCameraOff;
  const isSpeaking = participant.uid === speakingParticipantUid;
  const isPinned = participant.uid === pinnedParticipantUid;

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedParticipant(isPinned ? null : participant.uid);
  };

  const renderContent = () => {
    if (isVideoOn) {
      if (participant.isLocal) {
        return <WebcamView />;
      }
      // Placeholder for remote participant's video stream
      return (
        <div className="participant-placeholder">
          <span className="avatar-icon icon">videocam</span>
          <p className="placeholder-text">Remote video on</p>
        </div>
      );
    }
    // Camera is off for anyone.
    return (
      <div className="participant-placeholder">
        <span className="avatar-icon icon">videocam_off</span>
      </div>
    );
  };

  return (
    <div
      className={cn('participant-tile', {
        'is-speaking': isSpeaking,
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