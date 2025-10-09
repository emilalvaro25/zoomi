/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useParticipantStore, useSettings, useUI } from '@/lib/state';
import c from 'classnames';
import { AVAILABLE_VOICES, AVAILABLE_LANGUAGES } from '@/lib/constants';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
// FIX: Import React to resolve namespace issue for React.ChangeEvent.
import React, { useEffect, useState } from 'react';

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const {
    voice: savedVoice,
    systemPrompt: savedSystemPrompt,
    setVoice,
    setSystemPrompt,
  } = useSettings();

  const { localParticipant, setLanguage } = useParticipantStore();

  const { connected } = useLiveAPIContext();
  const [voice, setLocalVoice] = useState(savedVoice);
  const [systemPrompt, setLocalSystemPrompt] = useState(savedSystemPrompt);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  useEffect(() => {
    // When sidebar opens, reset local state to match global state
    if (isSidebarOpen) {
      setLocalVoice(savedVoice);
      setLocalSystemPrompt(savedSystemPrompt);
    }
  }, [isSidebarOpen, savedVoice, savedSystemPrompt]);

  useEffect(() => {
    setIsDirty(
      voice !== savedVoice || systemPrompt !== savedSystemPrompt,
    );
  }, [voice, systemPrompt, savedVoice, savedSystemPrompt]);

  const handleSave = () => {
    setVoice(voice);
    setSystemPrompt(systemPrompt);
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timer);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (localParticipant) {
      setLanguage(localParticipant.uid, e.target.value);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsLinkCopied(true);
    setTimeout(() => {
      setIsLinkCopied(false);
    }, 2000);
  };

  return (
    <>
      <aside className={c('sidebar', { open: isSidebarOpen })}>
        <div className="sidebar-header">
          <h3>Settings</h3>
          <button onClick={toggleSidebar} className="close-button">
            <span className="icon">close</span>
          </button>
        </div>
        <div className="sidebar-content">
          <div className="sidebar-section">
            <label>Meeting Link</label>
            <div className="share-link-container">
              <input type="text" readOnly value={window.location.href} />
              <button onClick={handleCopyLink} title="Copy meeting link">
                <span className="icon">
                  {isLinkCopied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>
          <div className="sidebar-section">
            <fieldset disabled={connected}>
              <label>
                My Language
                <select
                  value={localParticipant?.language}
                  onChange={handleLanguageChange}
                >
                  {AVAILABLE_LANGUAGES.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                System Prompt
                <textarea
                  value={systemPrompt}
                  onChange={e => setLocalSystemPrompt(e.target.value)}
                  rows={5}
                />
              </label>
              <label>
                Voice
                <select
                  value={voice}
                  onChange={e => setLocalVoice(e.target.value)}
                >
                  {AVAILABLE_VOICES.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <p
                className="description"
                style={{
                  fontSize: '12px',
                  color: 'var(--Neutral-60)',
                  marginTop: '-8px',
                }}
              >
                Note: The voice setting applies to the translation audio for all
                participants.
              </p>
            </fieldset>
          </div>

          <div className="sidebar-footer">
            {showSaved && (
              <span className="saved-message">Settings saved!</span>
            )}
            <button
              className="save-button"
              onClick={handleSave}
              disabled={!isDirty || connected}
            >
              Save Settings
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}