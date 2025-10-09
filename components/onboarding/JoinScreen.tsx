import React, { useState, useEffect } from 'react';
import { useUI, useParticipantStore } from '../../lib/state';
import './JoinScreen.css';
import { supabase } from '../../lib/supabase';

const JoinScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setHasJoined, setShareModalOpen, setScheduleModalOpen } = useUI();
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

  const handleJoin = async (isHost: boolean) => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError('');
    setLoading(true);

    // A student/participant cannot create a new meeting. They must have a link.
    if (!isHost && !meetingId) {
      setError('You must have a meeting link to join as a participant.');
      setLoading(false);
      return;
    }

    try {
      // Auto-auth: sign up and sign in a new anonymous user
      const email = `${crypto.randomUUID()}@example.com`;
      const password = crypto.randomUUID(); // Use a secure random password
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (signUpError) {
        throw new Error(`Authentication failed: ${signUpError.message}`);
      }

      if (!signUpData.user || !signUpData.session) {
        throw new Error(
          'Authentication failed. This can happen if email confirmation is enabled in your Supabase project. Please disable it or adjust RLS policies to allow new user sign-ups.',
        );
      }
      const { id: uid } = signUpData.user;
      await supabase.auth.setSession(signUpData.session);

      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      const currentMeetingId = meetingId || crypto.randomUUID();

      const role = isHost ? 'host' : 'student';
      const status = role === 'host' ? 'in_meeting' : 'waiting';
      const language = role === 'host' ? 'English' : 'Spanish'; // Default student language

      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          uid,
          name,
          is_muted: role === 'student',
          is_camera_off: true,
          is_hand_raised: false,
          is_screen_sharing: false,
          meeting_id: currentMeetingId,
          role: role,
          language: language,
          status: status,
        });

      if (insertError) throw new Error(insertError.message);

      // Batch state updates to ensure smooth transition
      setLocalParticipantUid(uid);
      addLocalParticipant(name, role, uid, language, status);
      if (isHost && !meetingId) {
        setMeetingId(currentMeetingId);
      }
      setHasJoined(true);

      if (role === 'host') {
        if (window.location.protocol !== 'blob:') {
          const newUrl = `${window.location.pathname}?meetingId=${currentMeetingId}`;
          window.history.pushState({ path: newUrl }, '', newUrl);
        }
        setShareModalOpen(true);
      }
    } catch (err: any) {
      console.error('Error joining:', err);
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        setError('Camera and microphone permissions are required to join.');
      } else if (
        err.message &&
        (err.message.includes(
          "Could not find the 'is_screen_sharing' column",
        ) ||
          err.message.includes(
            'column "is_screen_sharing" of relation "participants" does not exist',
          ))
      ) {
        setError(
          "Database schema is out of date. Please run the provided SQL setup script in your Supabase project's SQL Editor to update the 'participants' table.",
        );
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    }
  };

  const handleScheduleMeeting = () => {
    setScheduleModalOpen(true);
  };

  if (loading) {
    return (
      <div className="join-screen-overlay">
        <div className="join-screen-container">
          <div className="spinner"></div>
          <h2>Joining...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="join-screen-overlay">
      <div className="join-screen-container">
        {meetingId ? (
          <>
            <h2>Join Meeting</h2>
            <p>Enter your name to request to join.</p>
            <div className="join-form">
              <label htmlFor="join-name">Your Name</label>
              <input
                id="join-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                aria-required="true"
              />
              {error && <p className="error-text">{error}</p>}
              <button
                onClick={() => handleJoin(false)}
                className="join-button"
              >
                Request to Join
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Welcome to Zoomi</h2>
            <p>Host or schedule a new meeting to get started.</p>
            <div className="join-form">
              <label htmlFor="host-name">Your Name</label>
              <input
                id="host-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                aria-required="true"
              />
              {error && <p className="error-text">{error}</p>}
              <button onClick={() => handleJoin(true)} className="join-button">
                Host Meeting
              </button>
              <button
                onClick={handleScheduleMeeting}
                className="join-button secondary-button"
              >
                Schedule Meeting
              </button>
            </div>
          </>
        )}
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
