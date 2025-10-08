/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useParticipantStore } from '@/lib/state';
import ParticipantTile from './ParticipantTile';
import './MeetingGrid.css';
import cn from 'classnames';

const MeetingGrid: React.FC = () => {
  const { participants, pinnedParticipantUid } = useParticipantStore();

  const sortedParticipants = React.useMemo(() => {
    if (!pinnedParticipantUid) {
      return participants;
    }
    const pinned = participants.find(p => p.uid === pinnedParticipantUid);
    const others = participants.filter(p => p.uid !== pinnedParticipantUid);
    return pinned ? [pinned, ...others] : participants;
  }, [participants, pinnedParticipantUid]);

  return (
    <div
      className={cn('meeting-grid', { 'has-pinned': !!pinnedParticipantUid })}
    >
      {sortedParticipants.map(participant => (
        <ParticipantTile key={participant.uid} participant={participant} />
      ))}
    </div>
  );
};

export default MeetingGrid;