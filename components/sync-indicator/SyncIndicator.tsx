/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { useUI, useSettings, useParticipantStore } from '../../lib/state';
import './SyncIndicator.css';
import cn from 'classnames';

export default function SyncIndicator() {
  const { countdown, isSpeakerOnCooldown } = useUI();
  const { isSyncedTranslation } = useSettings();
  const { localParticipant } = useParticipantStore();
  const [showReady, setShowReady] = useState(false);
  const wasOnCooldown = React.useRef(false);

  useEffect(() => {
    if (wasOnCooldown.current && !isSpeakerOnCooldown) {
      setShowReady(true);
      const timer = setTimeout(() => setShowReady(false), 3000); // Show "Ready" for 3s
      return () => clearTimeout(timer);
    }
    wasOnCooldown.current = isSpeakerOnCooldown;
  }, [isSpeakerOnCooldown]);

  if (!isSyncedTranslation || localParticipant?.role !== 'host') {
    return null;
  }

  const isVisible = countdown !== null || isSpeakerOnCooldown || showReady;

  return (
    <div className={cn('sync-indicator-overlay', { visible: isVisible })}>
      <div className="sync-indicator-content">
        {countdown !== null && countdown > 0 && (
          <>
            <div className="countdown-number">{countdown}</div>
            <p>Please finish your sentence</p>
          </>
        )}
        {isSpeakerOnCooldown && (
          <>
            <div className="spinner"></div>
            <p>Translating, please wait...</p>
          </>
        )}
        {showReady && (
          <>
            <div className="ready-icon">✅</div>
            <p>Ready to speak</p>
          </>
        )}
      </div>
    </div>
  );
}
