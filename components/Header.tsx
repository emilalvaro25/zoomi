/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI, useParticipantStore } from '@/lib/state';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const { toggleSidebar, toggleParticipantList } = useUI();
  const { localParticipant } = useParticipantStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header>
      <div className="header-left">
        <button
          className="participant-toggle-button"
          onClick={toggleParticipantList}
          aria-label="Toggle Participants"
        >
          <span className="icon">group</span>
        </button>
        <h1>Zoomi</h1>
      </div>
      <div className="header-right">
        {localParticipant && (
          <div className="user-info">
            <span>{localParticipant.name}</span>
            <button onClick={handleSignOut} className="signout-button">
              Sign Out
            </button>
          </div>
        )}
        <button
          className="settings-button"
          onClick={toggleSidebar}
          aria-label="Settings"
        >
          <span className="icon">tune</span>
        </button>
      </div>
    </header>
  );
}
