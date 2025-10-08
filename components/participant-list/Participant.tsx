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

// Simple hash function to generate a color from a string
const nameToColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 50%, 40%)`;
  return color;
};

const Participant: React.FC<ParticipantProps> = ({ participant }) => {
  const initial = participant.name
    ? participant.name.charAt(0).toUpperCase()
    : '?';
  const avatarColor = nameToColor(participant.uid);

  return (
    <li className="participant-item">
      <div
        className="participant-avatar"
        style={{ backgroundColor: avatarColor }}
      >
        <span>{initial}</span>
      </div>
      <div className="participant-info">
        <div className="name-and-badge">
          <span className="participant-name" title={participant.name}>
            {participant.name}
          </span>
          {participant.role === 'host' && (
            <span className="host-badge">Host</span>
          )}
        </div>
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
