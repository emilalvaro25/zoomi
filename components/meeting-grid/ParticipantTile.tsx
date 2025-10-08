/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Participant } from '@/lib/state';
import WebcamView from '../demo/webcam-view/WebcamView';
import './ParticipantTile.css';
import cn from 'classnames';

interface ParticipantTileProps {
  participant: Participant;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({ participant }) => {
  const isVideoOn = !participant.isCameraOff;

  const renderContent = () => {
    if (isVideoOn) {
      if (participant.isLocal) {
        return <WebcamView />;
      }
      // For remote participants with video on, the tile's dark background serves as a placeholder.
      return null;
    }
    // Camera is off for anyone.
    return (
      <div className="participant-placeholder">
        <span className="avatar-icon icon">person</span>
      </div>
    );
  };

  return (
    <div className="participant-tile">
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
