import React, { useState } from 'react';
import { useUI, useParticipantStore, useSettings } from '@/lib/state';
import { AVAILABLE_LANGUAGES } from '@/lib/constants';
import './JoinScreen.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const JoinScreen: React.FC = () => {
  const [name, setName] = useState('');
  const { setHasJoined } = useUI();
  const { addLocalParticipant } = useParticipantStore();
  const { language, setLanguage } = useSettings();
  const [error, setError] = useState('');
  const { session } = useAuth();

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
      // Request permissions
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      const { error: insertError } = await supabase.from('participants').insert([
        {
          uid,
          name,
          is_muted: true,
          is_camera_off: true,
        },
      ]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Add participant and join
      addLocalParticipant(name);
      setHasJoined(true);
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Meeting link copied to clipboard!');
  };

  return (
    <div className="join-screen-overlay">
      <div className="join-screen-container">
        <h2>Join Meeting</h2>
        <p>Set up your camera and microphone before joining.</p>
        <div className="join-form">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            aria-label="Your name"
          />
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label="Select output language"
          >
            {AVAILABLE_LANGUAGES.map(lang => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          {error && <p className="error-text">{error}</p>}
          <button onClick={handleJoin} className="join-button">
            Join Now
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
        <div className="share-link-container">
          <input type="text" readOnly value={window.location.href} />
          <button onClick={handleCopyLink} title="Copy meeting link">
            <span className="icon">content_copy</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinScreen;
