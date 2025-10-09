/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useParticipantStore, useSettings, useUI } from '@/lib/state';
import c from 'classnames';
import { AVAILABLE_LANGUAGES, TTS_PROVIDERS } from '@/lib/constants';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
// FIX: Import React to resolve namespace issue for React.ChangeEvent.
import React, { useEffect, useState } from 'react';

export default function Sidebar() {
  const {
    isSidebarOpen,
    toggleSidebar,
    meetingId,
    isServerSettingsUnlocked,
    setServerSettingsUnlocked,
  } = useUI();
  const {
    voice: savedVoice,
    systemPrompt: savedSystemPrompt,
    availableVoices,
    cartesiaApiKey: savedCartesiaKey,
    huggingfaceApiKey: savedHuggingfaceKey,
    openaiApiKey: savedOpenAIKey,
    activeTtsProvider: savedTtsProvider,
    setVoice,
    setSystemPrompt,
    addVoice,
    setCartesiaApiKey,
    setHuggingfaceApiKey,
    setOpenaiApiKey,
    setActiveTtsProvider,
  } = useSettings();

  const { localParticipant, setLanguage } = useParticipantStore();

  const { connected } = useLiveAPIContext();
  const [voice, setLocalVoice] = useState(savedVoice);
  const [systemPrompt, setLocalSystemPrompt] = useState(savedSystemPrompt);
  const [cartesiaApiKey, setLocalCartesiaApiKey] = useState(savedCartesiaKey);
  const [huggingfaceApiKey, setLocalHuggingfaceApiKey] =
    useState(savedHuggingfaceKey);
  const [openaiApiKey, setLocalOpenAIKey] = useState(savedOpenAIKey);
  const [activeTtsProvider, setLocalActiveTtsProvider] =
    useState(savedTtsProvider);

  const [isDirty, setIsDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState('');

  const meetingLink = meetingId
    ? `${window.location.origin}/?meetingId=${meetingId}`
    : window.location.origin;

  useEffect(() => {
    // When sidebar opens, reset local state to match global state
    if (isSidebarOpen) {
      setLocalVoice(savedVoice);
      setLocalSystemPrompt(savedSystemPrompt);
      setLocalCartesiaApiKey(savedCartesiaKey);
      setLocalHuggingfaceApiKey(savedHuggingfaceKey);
      setLocalOpenAIKey(savedOpenAIKey);
      setLocalActiveTtsProvider(savedTtsProvider);
    }
  }, [
    isSidebarOpen,
    savedVoice,
    savedSystemPrompt,
    savedCartesiaKey,
    savedHuggingfaceKey,
    savedOpenAIKey,
    savedTtsProvider,
  ]);

  useEffect(() => {
    setIsDirty(
      voice !== savedVoice ||
        systemPrompt !== savedSystemPrompt ||
        cartesiaApiKey !== savedCartesiaKey ||
        huggingfaceApiKey !== savedHuggingfaceKey ||
        openaiApiKey !== savedOpenAIKey ||
        activeTtsProvider !== savedTtsProvider,
    );
  }, [
    voice,
    systemPrompt,
    savedVoice,
    savedSystemPrompt,
    cartesiaApiKey,
    huggingfaceApiKey,
    openaiApiKey,
    activeTtsProvider,
    savedCartesiaKey,
    savedHuggingfaceKey,
    savedOpenAIKey,
    savedTtsProvider,
  ]);

  const handleSave = () => {
    setVoice(voice);
    setSystemPrompt(systemPrompt);
    setCartesiaApiKey(cartesiaApiKey);
    setHuggingfaceApiKey(huggingfaceApiKey);
    setOpenaiApiKey(openaiApiKey);
    setActiveTtsProvider(activeTtsProvider);
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
    navigator.clipboard.writeText(meetingLink);
    setIsLinkCopied(true);
    setTimeout(() => {
      setIsLinkCopied(false);
    }, 2000);
  };

  const handleAddNewVoice = () => {
    if (newVoiceName.trim()) {
      addVoice(newVoiceName.trim());
      setNewVoiceName('');
    }
  };

  const handleUnlockServerSettings = () => {
    if (isServerSettingsUnlocked) return;
    const code = prompt('Please enter the access code to view server settings:');
    if (code === '1202AQ') {
      setServerSettingsUnlocked(true);
    } else if (code) {
      alert('Incorrect access code.');
    }
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
              <input type="text" readOnly value={meetingLink} />
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
                  {availableVoices.map(v => (
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

          <div className="sidebar-section">
            <h4
              className={c('sidebar-section-title', {
                clickable: !isServerSettingsUnlocked,
              })}
              onClick={handleUnlockServerSettings}
              title={isServerSettingsUnlocked ? '' : 'Click to unlock'}
            >
              Server Settings
            </h4>
            {isServerSettingsUnlocked && (
              <fieldset disabled={connected}>
                <label>
                  Active TTS Provider
                  <select
                    value={activeTtsProvider}
                    onChange={e => setLocalActiveTtsProvider(e.target.value)}
                  >
                    {TTS_PROVIDERS.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cartesia API Key
                  <input
                    type="password"
                    placeholder="Enter Cartesia API Key"
                    value={cartesiaApiKey}
                    onChange={e => setLocalCartesiaApiKey(e.target.value)}
                  />
                </label>
                <label>
                  Huggingface API Key
                  <input
                    type="password"
                    placeholder="Enter Huggingface API Key"
                    value={huggingfaceApiKey}
                    onChange={e => setLocalHuggingfaceApiKey(e.target.value)}
                  />
                </label>
                <label>
                  OpenAI API Key
                  <input
                    type="password"
                    placeholder="Enter OpenAI API Key"
                    value={openaiApiKey}
                    onChange={e => setLocalOpenAIKey(e.target.value)}
                  />
                </label>

                <label>
                  Add New TTS Voice
                  <div className="add-voice-container">
                    <input
                      type="text"
                      placeholder="Enter voice name"
                      value={newVoiceName}
                      onChange={e => setNewVoiceName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewVoice();
                        }
                      }}
                    />
                    <button onClick={handleAddNewVoice}>Add</button>
                  </div>
                </label>
              </fieldset>
            )}
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
