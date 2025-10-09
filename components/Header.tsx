/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI } from '@/lib/state';

export default function Header() {
  const { toggleSidebar, toggleParticipantList } = useUI();

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
