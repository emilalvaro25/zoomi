import React, { useEffect } from 'react';
import './JoinScreen.css'; // Re-use styles
import { useUI, useParticipantStore } from '@/lib/state';

const DeniedScreen: React.FC = () => {
  const { setHasJoined, setMeetingId } = useUI();
  const { setParticipants, setLocalParticipantUid } = useParticipantStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Reset state to go back to the join screen
      setHasJoined(false);
      setMeetingId(null);
      setParticipants([]);
      setLocalParticipantUid(null);
      if (window.location.protocol !== 'blob:') {
        window.history.pushState({}, '', window.location.pathname);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [setHasJoined, setMeetingId, setParticipants, setLocalParticipantUid]);

  return (
    <div className="join-screen-overlay">
      <div className="join-screen-container denied-screen-container">
        <h2>Request to Join Denied</h2>
        <p>The meeting host did not admit you to the meeting.</p>
        <p>You will be redirected shortly.</p>
      </div>
    </div>
  );
};

export default DeniedScreen;
