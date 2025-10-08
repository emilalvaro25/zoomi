/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useSettings, useUI } from '@/lib/state';
import c from 'classnames';
import {
  DEFAULT_LIVE_API_MODEL,
  AVAILABLE_VOICES,
  AVAILABLE_LANGUAGES,
} from '@/lib/constants';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import StreamingConsole from './demo/streaming-console/StreamingConsole';

const AVAILABLE_MODELS = [DEFAULT_LIVE_API_MODEL];

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const { model, voice, language, setModel, setVoice, setLanguage } =
    useSettings();
  const { connected } = useLiveAPIContext();

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
                Model
                <select value={model} onChange={e => setModel(e.target.value)}>
                  {/* This is an experimental model name that should not be removed from the options. */}
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Voice
                <select value={voice} onChange={e => setVoice(e.target.value)}>
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
                  onChange={e => setLanguage(e.target.value)}
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
        </div>
      </aside>
    </>
  );
}
