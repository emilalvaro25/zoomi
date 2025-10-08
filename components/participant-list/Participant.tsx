/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Participant as ParticipantType } from '@/lib/state';
import './Participant.css';

interface ParticipantProps {
  participant: ParticipantType;
}

// FIX: Refactored component to use `React.FC` to correctly handle React-specific props like `key`.
const Participant: React.FC<ParticipantProps> = ({ participant }) => {
  return (
    <li className="participant-item">
      <div className="participant-avatar">
        <span className="icon">person</span>
      </div>
      <div className="participant-info">
        <span className="participant-name" title={participant.name}>
          {participant.name}
        </span>
      </div>
      <div className="participant-status">
        {participant.isMuted ? (
          <span className="icon muted" title="Muted">
            mic_off
          </span>
        ) : (
          <span className="icon" title="Unmuted">
            mic
          </span>
        )}
        {participant.isCameraOff ? (
          <span className="icon cam-off" title="Camera Off">
            videocam_off
          </span>
        ) : (
          <span className="icon" title="Camera On">
            videocam
          </span>
        )}
      </div>
    </li>
  );
};

export default Participant;
