import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUI, useParticipantStore } from '@/lib/state';
import ChatMessage, { Message } from './ChatMessage';

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const meetingId = useUI(state => state.meetingId);
  const localParticipant = useParticipantStore(state => state.localParticipant);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!meetingId) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error.message);
      } else if (data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${meetingId}-chat`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `meeting_id=eq.${meetingId}`,
        },
        payload => {
          setMessages(prevMessages => [...prevMessages, payload.new as Message]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `meeting_id=eq.${meetingId}`,
        },
        payload => {
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === payload.new.id ? (payload.new as Message) : msg,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !localParticipant || !meetingId) return;

    const { error } = await supabase.from('messages').insert({
      meeting_id: meetingId,
      participant_id: localParticipant.uid,
      text: newMessage.trim(),
      is_final: true, // Chat messages are always final
      source_language: localParticipant.language || 'English',
    });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
        />
        <button type="submit">
          <span className="icon">send</span>
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
