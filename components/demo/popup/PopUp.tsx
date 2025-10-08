/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './PopUp.css';

interface PopUpProps {
  onClose: () => void;
}

const PopUp: React.FC<PopUpProps> = ({ onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Welcome to Zoomi</h2>
        <p>Your new video conferencing experience.</p>
        <p>To get started:</p>
        <ol>
          <li>
            <span className="icon">videocam</span>Start your camera to join the
            call.
          </li>
          <li>
            <span className="icon">mic</span>Unmute your microphone to speak.
          </li>
          <li>
            <span className="icon">group</span>See who else is in the meeting.
          </li>
        </ol>
        <button onClick={onClose}>Get Started</button>
      </div>
    </div>
  );
};

export default PopUp;