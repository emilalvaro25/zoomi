import React, { useState, useEffect } from 'react';
import { useParticipantStore } from '@/lib/state';
import { translateText } from '@/lib/gemini';
import cn from 'classnames';

export interface Message {
  id: string;
  created_at: string;
  participant_id: string;
  text: string;
  is_final: boolean;
  source_language?: string;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { participants, localParticipant } = useParticipantStore();
  const [translatedText, setTranslatedText] = useState('');

  const sender = participants.find(p => p.uid === message.participant_id);
  const isLocal = sender?.isLocal || false;
  const isHost = localParticipant?.role === 'host';
  const isFromStudent = sender?.role === 'student';

  useEffect(() => {
    const translateForHost = async () => {
      if (isHost && isFromStudent && message.text) {
        try {
          const translation = await translateText(message.text, 'English');
          setTranslatedText(translation);
        } catch (error) {
          console.error('Chat translation error:', error);
          setTranslatedText('Translation failed.');
        }
      }
    };

    if (message.is_final) {
      translateForHost();
    }
  }, [isHost, isFromStudent, message.text, message.is_final]);

  if (!sender) return null;

  return (
    <div className="chat-message">
      <div className={cn('message-header', { local: isLocal })}>
        {sender.name}
      </div>
      <div
        className={cn('message-content', { interim: !message.is_final })}
      >
        <span>{message.text}</span>
        {translatedText && (
          <div className="translated-text">{translatedText}</div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
