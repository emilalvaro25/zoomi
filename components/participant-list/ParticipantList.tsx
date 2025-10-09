/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useParticipantStore } from '../../lib/state';
import Participant from './Participant';
import './ParticipantList.css';
import cn from 'classnames';
import ChatBox from '../chat/ChatBox';

export default function ParticipantList({ className }: { className?: string }) {
  const { participants } = useParticipantStore();

  return (
    <aside className={cn('participant-list-container', className)}>
      <h3 className="participant-list-header">
        Participants ({participants.length})
      </h3>
      <ul className="participant-list-items">
        {participants.map(participant => (
          <Participant key={participant.uid} participant={participant} />
        ))}
      </ul>
      <ChatBox />
    </aside>
  );
}
