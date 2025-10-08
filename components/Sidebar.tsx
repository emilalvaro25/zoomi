/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useSettings, useUI } from '@/lib/state';
import c from 'classnames';
import { AVAILABLE_VOICES, AVAILABLE_LANGUAGES } from '@/lib/constants';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import StreamingConsole from './demo/streaming-console/StreamingConsole';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const {
    voice: savedVoice,
    language: savedLanguage,
    setVoice,
    setLanguage,
  } = useSettings();
  const { connected } = useLiveAPIContext();
  const [voice, setLocalVoice] = useState(savedVoice);
  const [language, setLocalLanguage] = useState(savedLanguage);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    // When sidebar opens, reset local state to match global state
    if (isSidebarOpen) {
      setLocalVoice(savedVoice);
      setLocalLanguage(savedLanguage);
    }
  }, [isSidebarOpen, savedVoice, savedLanguage]);

  useEffect(() => {
    setIsDirty(voice !== savedVoice || language !== savedLanguage);
  }, [voice, language, savedVoice, savedLanguage]);

  const handleSave = () => {
    setVoice(voice);
    setLanguage(language);
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timer);
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
            <fieldset disabled={connected}>
              <label>
                Voice
                <select value={voice} onChange={e => setLocalVoice(e.target.value)}>
                  {AVAILABLE_VOICES.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select
                  value={language}
                  onChange={e => setLocalLanguage(e.target.value)}
                >
                  {AVAILABLE_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          </div>
          <div className="sidebar-section transcript-section">
            <h4 className="sidebar-section-title">Transcript</h4>
            <StreamingConsole />
          </div>
          <div className="sidebar-footer">
            {showSaved && <span className="saved-message">Settings saved!</span>}
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