/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useParticipantStore } from '@/lib/state';
import ParticipantTile from './ParticipantTile';
import './MeetingGrid.css';

const MeetingGrid: React.FC = () => {
  const { participants } = useParticipantStore();

  return (
    <div className="meeting-grid">
      {participants.map(participant => (
        <ParticipantTile key={participant.uid} participant={participant} />
      ))}
    </div>
  );
};

export default MeetingGrid;
