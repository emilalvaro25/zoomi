import React, { useState, useEffect, useRef } from 'react';
import cn from 'classnames';
import './SubtitleOverlay.css';

interface SubtitleOverlayProps {
  text: string;
  isFinal: boolean;
}

const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ text, isFinal }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (text) {
      setVisible(true);

      if (isFinal) {
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
  }, [text, isFinal]);

  if (!text) {
    return null;
  }

  return (
    <div className={cn('subtitle-overlay', { visible })}>
      <p className={cn('subtitle-text', { interim: !isFinal })}>{text}</p>
    </div>
  );
};

export default SubtitleOverlay;
