import React from 'react';

interface VoiceTypingOverlayProps {
  movie: string;
  typedText: string;
  isMatched: boolean;
  statusText?: string;
}

export const VoiceTypingOverlay: React.FC<VoiceTypingOverlayProps> = ({
  movie,
  typedText,
  isMatched,
  statusText: _statusText
}) => {
  return (
    <div className="firetv-voice-typing-overlay">
      {/* Alexa Pulsing Soundwave / Voice Icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="alexa-voice-soundwave">
          <div className="alexa-voice-bar"></div>
          <div className="alexa-voice-bar"></div>
          <div className="alexa-voice-bar"></div>
          <div className="alexa-voice-bar"></div>
          <div className="alexa-voice-bar"></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="voice-search-label">Alexa Voice Search</span>
          <span style={{ fontSize: '10px', color: '#94A3B8' }}>Fire TV Voice Typing • "{movie}"</span>
        </div>
      </div>

      {/* Auto-typing text bar with blinking cursor */}
      <div className="voice-search-input-pill">
        <span style={{ fontSize: '13px' }}>🔍</span>
        <span className="voice-typed-text">
          {typedText}
          {!isMatched && <span className="typing-cursor"></span>}
        </span>
      </div>

      {/* Status indicator - only show while typing, do not display matched tag */}
      {!isMatched && (
        <div className="voice-search-status-tag voice-status-typing">
          <span>🎙️</span>
          <span>Listening & Typing...</span>
        </div>
      )}
    </div>
  );
};
