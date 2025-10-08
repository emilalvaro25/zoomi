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
    const sorted = [...participants].sort((a, b) => {
      // Pinned participant always first
      if (a.uid === pinnedParticipantUid) return -1;
      if (b.uid === pinnedParticipantUid) return 1;

      // Participants with hand raised next
      if (a.isHandRaised && !b.isHandRaised) return -1;
      if (!a.isHandRaised && b.isHandRaised) return 1;

      // Sort by role (host before student) as a tie-breaker
      if (a.role === 'host' && b.role !== 'host') return -1;
      if (a.role !== 'host' && b.role === 'host') return 1;
      
      // Finally, sort by name
      return a.name.localeCompare(b.name);
    });
    return sorted;
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