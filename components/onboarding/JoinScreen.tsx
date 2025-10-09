import React, { useState, useEffect } from 'react';
import { useUI, useParticipantStore } from '@/lib/state';
import './JoinScreen.css';
import { supabase } from '@/lib/supabase';

const JoinScreen: React.FC = () => {
  const [name, setName] = useState('');
  const { setHasJoined, setShareModalOpen } = useUI();
  const { addLocalParticipant, setLocalParticipantUid } = useParticipantStore();
  const [error, setError] = useState('');
  const meetingId = useUI(state => state.meetingId);
  const setMeetingId = useUI(state => state.setMeetingId);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('meetingId');
    if (id) {
      setMeetingId(id);
    }
  }, [setMeetingId]);

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError('');

    const uid = crypto.randomUUID();

    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      const currentMeetingId = meetingId || crypto.randomUUID();
      if (!meetingId) {
        setMeetingId(currentMeetingId);
      }

      // Determine role: first person in is host
      const { data: existingParticipants, error: fetchError } = await supabase
        .from('participants')
        .select('uid')
        .eq('meeting_id', currentMeetingId)
        .limit(1);

      if (fetchError) throw fetchError;
      const role = existingParticipants.length > 0 ? 'student' : 'host';
      const language = role === 'host' ? 'English' : 'Spanish'; // Default student language

      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          uid,
          name,
          is_muted: role === 'student',
          is_camera_off: true,
          is_hand_raised: false,
          meeting_id: currentMeetingId,
          role: role,
          language: language,
        });

      if (insertError) throw new Error(insertError.message);

      setLocalParticipantUid(uid);
      addLocalParticipant(name, role, uid, language);
      setHasJoined(true);

      if (role === 'host') {
        const newUrl = `${window.location.origin}${window.location.pathname}?meetingId=${currentMeetingId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        setShareModalOpen(true);
      }
    } catch (err: any) {
      console.error('Error joining:', err);
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        setError('Camera and microphone permissions are required to join.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="join-screen-overlay">
      <div className="join-screen-container">
        <h2>Join Meeting</h2>
        <p>Enter your name to join the meeting.</p>
        <div className="join-form">
          <label htmlFor="join-name">Your Name</label>
          <input
            id="join-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          {error && <p className="error-text">{error}</p>}
          <button onClick={handleJoin} className="join-button">
            Join Meeting
          </button>
        </div>
        <div className="permissions-info">
          <p>You'll be asked for permission to use your:</p>
          <ul>
            <li>
              <span className="icon">mic</span> Microphone
            </li>
            <li>
              <span className="icon">videocam</span> Camera
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinScreen;
