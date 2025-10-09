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
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sender = participants.find(p => p.uid === message.participant_id);
  const isLocal = sender?.isLocal || false;
  const isHost = localParticipant?.role === 'host';

  const needsTranslation =
    localParticipant?.language &&
    message.source_language &&
    localParticipant.language !== message.source_language;

  useEffect(() => {
    // Reset state for new messages
    setTranslation(null);
    setIsLoading(false);

    if (needsTranslation && message.is_final && message.text.trim()) {
      const performTranslation = async () => {
        setIsLoading(true);
        try {
          const translated = await translateText(
            message.text,
            localParticipant!.language!,
          );
          setTranslation(translated);
        } catch (error) {
          console.error('Chat translation error:', error);
          setTranslation('Translation failed.');
        } finally {
          setIsLoading(false);
        }
      };
      performTranslation();
    }
  }, [
    message.id, // Re-run effect when the message ID changes
    message.text,
    message.is_final,
    needsTranslation,
    localParticipant?.language,
  ]);

  if (!sender) return null;

  const renderContent = () => {
    // Host sees original and translation
    if (isHost) {
      return (
        <>
          <span>{message.text}</span>
          {isLoading && (
            <div className="translated-text loading-translation">
              Translating...
            </div>
          )}
          {translation && <div className="translated-text">{translation}</div>}
        </>
      );
    }

    // Student sees only the relevant version
    if (needsTranslation) {
      if (isLoading) {
        return <span className="loading-translation">Translating...</span>;
      }
      // Show translation, with original as a fallback on error
      return <span>{translation || message.text}</span>;
    }

    // If no translation needed, show original text
    return <span>{message.text}</span>;
  };

  return (
    <div className="chat-message">
      <div className={cn('message-header', { local: isLocal })}>
        {sender.name}
      </div>
      <div className={cn('message-content', { interim: !message.is_final })}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ChatMessage;
