/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useParticipantStore } from '@/lib/state';
import Participant from './Participant';
import './ParticipantList.css';

export default function ParticipantList() {
  const { participants } = useParticipantStore();

  return (
    <aside className="participant-list">
      <h3 className="participant-list-header">
        Participants ({participants.length})
      </h3>
      <ul className="participant-list-items">
        {participants.map(participant => (
          <Participant key={participant.uid} participant={participant} />
        ))}
      </ul>
    </aside>
  );
}
