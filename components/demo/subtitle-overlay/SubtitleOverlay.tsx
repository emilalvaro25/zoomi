import React, { useState, useEffect, useRef } from 'react';
import { useLogStore } from '@/lib/state';
import cn from 'classnames';
import './SubtitleOverlay.css';

const SubtitleOverlay: React.FC = () => {
  const turns = useLogStore(state => state.turns);
  const [visible, setVisible] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;

    if (lastTurn && (lastTurn.role === 'user' || lastTurn.role === 'agent')) {
      setCurrentText(lastTurn.text);
      setIsFinal(lastTurn.isFinal);
      setVisible(true);

      if (lastTurn.isFinal) {
        timeoutRef.current = window.setTimeout(() => {
          setVisible(false);
        }, 5000); // Fade out 5 seconds after the final text
      }
    } else {
      setVisible(false);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [turns]);

  if (!currentText) {
    return null;
  }

  return (
    <div className={cn('subtitle-overlay', { visible })}>
      <p className={cn('subtitle-text', { interim: !isFinal })}>
        {currentText}
      </p>
    </div>
  );
};

export default SubtitleOverlay;
