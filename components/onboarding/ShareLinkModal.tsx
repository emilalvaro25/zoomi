import React from 'react';
import Modal from '../Modal';
import { useUI } from '@/lib/state';

interface ShareLinkModalProps {
  onClose: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ onClose }) => {
  const { meetingId } = useUI();
  const meetingLink = meetingId
    ? `${window.location.origin}/?meetingId=${meetingId}`
    : window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    alert('Meeting link copied to clipboard!');
  };

  return (
    <Modal onClose={onClose}>
      <div className="share-link-modal">
        <h3>Your Meeting is Ready!</h3>
        <p>Share this link with your students to have them join.</p>
        <div className="share-link-container">
          <input type="text" readOnly value={meetingLink} />
          <button onClick={handleCopyLink} title="Copy meeting link">
            <span className="icon">content_copy</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareLinkModal;
