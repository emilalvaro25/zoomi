/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI } from '@/lib/state';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function Header() {
  const { toggleSidebar, toggleParticipantList } = useUI();
  const { session } = useAuth();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
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
        {session && (
          <div className="user-info">
            <span>{session.user.email}</span>
            <button className="signout-button" onClick={handleSignOut}>
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
