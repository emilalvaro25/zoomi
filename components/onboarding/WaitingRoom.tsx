import React from 'react';
import './JoinScreen.css'; // Re-use styles

const WaitingRoom: React.FC = () => {
  return (
    <div className="join-screen-overlay">
      <div className="join-screen-container waiting-room-container">
        <div className="spinner"></div>
        <h2>Waiting to be Admitted</h2>
        <p>The meeting host will let you in soon.</p>
      </div>
    </div>
  );
};

export default WaitingRoom;
