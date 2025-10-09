import React, { useState } from 'react';
import Modal from '../Modal';
import { useUI } from '@/lib/state';

interface ScheduleMeetingModalProps {
  onClose: () => void;
}

interface ConfirmationDetails {
  title: string;
  date: string;
  time: string;
  meetingLink: string;
  icsUrl: string;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [emails, setEmails] = useState('');
  const [error, setError] = useState('');
  const [confirmationDetails, setConfirmationDetails] =
    useState<ConfirmationDetails | null>(null);

  const formatDateForICS = (date: Date): string => {
    return date.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  };

  const handleSchedule = () => {
    if (!title.trim() || !date || !time) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');

    const meetingId = crypto.randomUUID();
    const meetingLink = `${window.location.origin}/?meetingId=${meetingId}`;

    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Zoomi//Meeting Scheduler//EN
BEGIN:VEVENT
UID:${crypto.randomUUID()}@zoomi.app
DTSTAMP:${formatDateForICS(new Date())}
DTSTART:${formatDateForICS(startDateTime)}
DTEND:${formatDateForICS(endDateTime)}
SUMMARY:${title}
DESCRIPTION:Join your Zoomi meeting: ${meetingLink}\\n\\nInvited Participants: ${emails.replace(
      /,/g,
      '\\,',
    )}
LOCATION:${meetingLink}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const icsUrl = URL.createObjectURL(blob);

    setConfirmationDetails({
      title,
      date,
      time,
      meetingLink,
      icsUrl,
    });
  };

  const renderForm = () => (
    <>
      <h3>Schedule a New Meeting</h3>
      <p>Fill in the details below to create a new meeting.</p>
      <div className="join-form">
        <div className="form-field">
          <label htmlFor="meeting-title">Meeting Title</label>
          <input
            id="meeting-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Weekly Sync"
          />
        </div>
        <div className="time-date-fields">
          <div className="form-field">
            <label htmlFor="meeting-date">Date</label>
            <input
              id="meeting-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="meeting-time">Time</label>
            <input
              id="meeting-time"
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="meeting-emails">Participant Emails (optional)</label>
          <textarea
            id="meeting-emails"
            value={emails}
            onChange={e => setEmails(e.target.value)}
            placeholder="Enter comma-separated emails"
            rows={3}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button onClick={handleSchedule} className="join-button">
          Schedule & Get Invite
        </button>
      </div>
    </>
  );

  const renderConfirmation = () => (
    <div className="confirmation-view">
      <h3>Meeting Scheduled!</h3>
      <p>
        Your meeting "{confirmationDetails?.title}" is scheduled for{' '}
        {confirmationDetails?.date} at {confirmationDetails?.time}.
      </p>
      <div className="share-link-container">
        <input type="text" readOnly value={confirmationDetails?.meetingLink} />
        <button
          onClick={() =>
            navigator.clipboard.writeText(confirmationDetails!.meetingLink)
          }
          title="Copy meeting link"
        >
          <span className="icon">content_copy</span>
        </button>
      </div>
      <a
        href={confirmationDetails?.icsUrl}
        download={`${confirmationDetails?.title}.ics`}
        className="join-button download-button"
      >
        <span className="icon">calendar_add_on</span>
        Download Calendar Invite (.ics)
      </a>
      <button
        onClick={() => setConfirmationDetails(null)}
        className="join-button secondary-button"
      >
        Schedule Another Meeting
      </button>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      <div className="schedule-meeting-modal">
        {confirmationDetails ? renderConfirmation() : renderForm()}
      </div>
    </Modal>
  );
};

export default ScheduleMeetingModal;
