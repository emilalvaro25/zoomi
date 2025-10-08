import React, { useState } from 'react';
import { useUI, useParticipantStore, useSettings } from '@/lib/state';
import { AVAILABLE_LANGUAGES } from '@/lib/constants';
import './JoinScreen.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import ShareLinkModal from './ShareLinkModal';

const JoinScreen: React.FC = () => {
  const [name, setName] = useState('');
  const { setHasJoined } = useUI();
  const { addLocalParticipant } = useParticipantStore();
  const { language, setLanguage } = useSettings();
  const [error, setError] = useState('');
  const { session } = useAuth();
  const meetingId = useUI(state => state.meetingId);
  const setMeetingId = useUI(state => state.setMeetingId);
  const [showShareModal, setShowShareModal] = useState(false);

  const isJoining = !!meetingId;

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError('');

    const uid = session?.user.id;
    if (!uid) {
      setError('You must be logged in to join.');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      const currentMeetingId = meetingId || crypto.randomUUID();
      if (!meetingId) {
        setMeetingId(currentMeetingId);
      }

      const role = isJoining ? 'student' : 'host';

      const { error: upsertError } = await supabase.from('participants').upsert(
        {
          uid,
          name,
          is_muted: role === 'student',
          is_camera_off: true,
          meeting_id: currentMeetingId,
          role: role,
          language: role === 'student' ? language : 'English',
        },
        { onConflict: 'uid' },
      );

      if (upsertError) throw new Error(upsertError.message);

      addLocalParticipant(name, role, language);
      setHasJoined(true);

      if (role === 'host') {
        const newUrl = `${window.location.origin}${window.location.pathname}?meetingId=${currentMeetingId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        setShowShareModal(true);
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
    <>
      <div className="join-screen-overlay">
        <div className="join-screen-container">
          <h2>{isJoining ? 'Join Meeting' : 'New Meeting'}</h2>
          <p>
            {isJoining
              ? 'Set up your display name and language before joining.'
              : 'Enter your name to start a new meeting as the host.'}
          </p>
          <div className="join-form">
            <label htmlFor="join-name">Your Name</label>
            <input
              id="join-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {isJoining && (
              <>
                <label htmlFor="join-language">Your Language</label>
                <select
                  id="join-language"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                >
                  {AVAILABLE_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </>
            )}

            {error && <p className="error-text">{error}</p>}
            <button onClick={handleJoin} className="join-button">
              {isJoining ? 'Join Now' : 'Start New Meeting'}
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
      {showShareModal && <ShareLinkModal onClose={() => setShowShareModal(false)} />}
    </>
  );
};

export default JoinScreen;
