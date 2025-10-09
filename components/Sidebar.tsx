/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  useParticipantStore,
  useSettings,
  useUI,
  TranslationMode,
} from '@/lib/state';
import c from 'classnames';
import {
  AVAILABLE_LANGUAGES,
  TTS_PROVIDERS,
  DEFAULT_VOICE,
} from '@/lib/constants';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
// FIX: Import React to resolve namespace issue for React.ChangeEvent.
import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchCartesiaVoices,
  fetchHuggingfaceVoices,
  fetchOpenAIVoices,
  getInitialVoices,
  GEMINI_VOICES,
  CARTESIA_VOICES,
  HUGGINGFACE_VOICES,
  OPENAI_VOICES,
} from '@/lib/voices';

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
    translationVolume: savedTranslationVolume,
    translationMode: savedTranslationMode,
    isSyncedTranslation: savedIsSyncedTranslation,
    setVoice,
    setSystemPrompt,
    setAvailableVoices,
    setCartesiaApiKey,
    setHuggingfaceApiKey,
    setOpenaiApiKey,
    setActiveTtsProvider,
    setTranslationVolume,
    setTranslationMode,
    setIsSyncedTranslation,
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
  const [translationVolume, setLocalTranslationVolume] =
    useState(savedTranslationVolume);
  const [translationMode, setLocalTranslationMode] =
    useState(savedTranslationMode);
  const [isSyncedTranslation, setLocalIsSyncedTranslation] = useState(
    savedIsSyncedTranslation,
  );

  const [isDirty, setIsDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const meetingLink = meetingId
    ? `${window.location.origin}/?meetingId=${meetingId}`
    : window.location.origin;

  // Effect to fetch and update voices when API keys change
  useEffect(() => {
    const updateVoices = async () => {
      const allPromises = [
        fetchCartesiaVoices(savedCartesiaKey),
        fetchHuggingfaceVoices(savedHuggingfaceKey),
        fetchOpenAIVoices(savedOpenAIKey),
      ];

      const results = await Promise.all(allPromises);
      const fetchedVoices = results.flat();

      const newVoiceList = [...getInitialVoices(), ...fetchedVoices];

      setAvailableVoices(newVoiceList);
    };

    updateVoices();
  }, [
    savedCartesiaKey,
    savedHuggingfaceKey,
    savedOpenAIKey,
    setAvailableVoices,
  ]);

  const displayedVoices = useMemo(() => {
    // Only show voices for the selected provider.
    // `availableVoices` from the store already accounts for whether API keys are present.
    switch (activeTtsProvider) {
      case 'Cartesia':
        return availableVoices.filter(v => CARTESIA_VOICES.includes(v));
      case 'Huggingface':
        return availableVoices.filter(v => HUGGINGFACE_VOICES.includes(v));
      case 'OpenAI Realtime':
        return availableVoices.filter(v => OPENAI_VOICES.includes(v));
      case 'Browser Default':
      default:
        // "Browser Default" uses Gemini's pre-built voices
        return availableVoices.filter(v => GEMINI_VOICES.includes(v));
    }
  }, [activeTtsProvider, availableVoices]);

  // Effect to reset voice if it's not in the displayed list
  useEffect(() => {
    if (displayedVoices.length > 0 && !displayedVoices.includes(voice)) {
      setLocalVoice(displayedVoices[0]);
    } else if (displayedVoices.length === 0 && voice !== DEFAULT_VOICE) {
      setLocalVoice(DEFAULT_VOICE);
    }
  }, [displayedVoices, voice]);

  useEffect(() => {
    // When sidebar opens, reset local state to match global state
    if (isSidebarOpen) {
      setLocalVoice(savedVoice);
      setLocalSystemPrompt(savedSystemPrompt);
      setLocalCartesiaApiKey(savedCartesiaKey);
      setLocalHuggingfaceApiKey(savedHuggingfaceKey);
      setLocalOpenAIKey(savedOpenAIKey);
      setLocalActiveTtsProvider(savedTtsProvider);
      setLocalTranslationVolume(savedTranslationVolume);
      setLocalTranslationMode(savedTranslationMode);
      setLocalIsSyncedTranslation(savedIsSyncedTranslation);
    }
  }, [
    isSidebarOpen,
    savedVoice,
    savedSystemPrompt,
    savedCartesiaKey,
    savedHuggingfaceKey,
    savedOpenAIKey,
    savedTtsProvider,
    savedTranslationVolume,
    savedTranslationMode,
    savedIsSyncedTranslation,
  ]);

  useEffect(() => {
    setIsDirty(
      voice !== savedVoice ||
        systemPrompt !== savedSystemPrompt ||
        cartesiaApiKey !== savedCartesiaKey ||
        huggingfaceApiKey !== savedHuggingfaceKey ||
        openaiApiKey !== savedOpenAIKey ||
        activeTtsProvider !== savedTtsProvider ||
        translationVolume !== savedTranslationVolume ||
        translationMode !== savedTranslationMode ||
        isSyncedTranslation !== savedIsSyncedTranslation,
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
    translationVolume,
    translationMode,
    isSyncedTranslation,
    savedCartesiaKey,
    savedHuggingfaceKey,
    savedOpenAIKey,
    savedTtsProvider,
    savedTranslationVolume,
    savedTranslationMode,
    savedIsSyncedTranslation,
  ]);

  const handleSave = () => {
    setVoice(voice);
    setSystemPrompt(systemPrompt);
    setCartesiaApiKey(cartesiaApiKey);
    setHuggingfaceApiKey(huggingfaceApiKey);
    setOpenaiApiKey(openaiApiKey);
    setActiveTtsProvider(activeTtsProvider);
    setTranslationVolume(translationVolume);
    setTranslationMode(translationMode);
    setIsSyncedTranslation(isSyncedTranslation);
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
                Translate Audio Source
                <select
                  value={translationMode}
                  onChange={e =>
                    setLocalTranslationMode(e.target.value as TranslationMode)
                  }
                >
                  <option value="bidirectional">
                    Bidirectional (Mic & Speakers)
                  </option>
                  <option value="incoming">Incoming (from Speakers)</option>
                  <option value="outgoing">Outgoing (from Mic)</option>
                  <option value="off">Off</option>
                </select>
              </label>
              <label>
                Translation Volume
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={translationVolume}
                  onChange={e =>
                    setLocalTranslationVolume(parseFloat(e.target.value))
                  }
                />
              </label>
              {localParticipant?.role === 'host' && (
                <>
                  <label className="toggle-label">
                    Synced Translation Mode
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isSyncedTranslation}
                        onChange={e =>
                          setLocalIsSyncedTranslation(e.target.checked)
                        }
                        disabled={connected}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </label>
                  <p className="description">
                    Forces speakers to pause for translation playback to ensure
                    clarity.
                  </p>
                </>
              )}
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
                  {displayedVoices.map(v => (
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
