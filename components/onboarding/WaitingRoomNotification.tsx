import React from 'react';
import { useParticipantStore } from '@/lib/state';
import './JoinScreen.css'; // Re-use styles

const WaitingRoomNotification: React.FC = () => {
  const { participants, admitParticipant, denyParticipant } = useParticipantStore();

  const waitingParticipants = participants.filter(p => p.status === 'waiting');

  if (waitingParticipants.length === 0) {
    return null;
  }

  return (
    <div className="waiting-room-notification">
      <div className="notification-header">
        <span className="icon">person</span>
        <h4>Waiting Room ({waitingParticipants.length})</h4>
      </div>
      <ul className="waiting-list">
        {waitingParticipants.map(p => (
          <li key={p.uid} className="waiting-participant">
            <span className="participant-name">{p.name}</span>
            <div className="participant-actions">
              <button className="admit-btn" onClick={() => admitParticipant(p.uid)}>
                Admit
              </button>
              <button className="deny-btn" onClick={() => denyParticipant(p.uid)}>
                Deny
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WaitingRoomNotification;