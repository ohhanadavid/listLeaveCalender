import React, { useState } from 'react';
import { useApp } from '../state/AppContext';

interface PinLoginProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PinLogin: React.FC<PinLoginProps> = ({ isOpen, onClose }) => {
  const { appData, setApproverMode } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    setError(null);
    const targetLength = appData.settings.approverPin.length;
    if (pin.length < targetLength) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-submit if it reaches the target length
      if (newPin.length === targetLength) {
        // Delay slightly for visual dot fill-in animation
        setTimeout(() => {
          verifyPin(newPin);
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setError(null);
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setError(null);
    setPin('');
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === appData.settings.approverPin) {
      setApproverMode(true);
      onClose();
    } else {
      setError('קוד PIN שגוי, אנא נסה שנית');
      setPin('');
    }
  };

  return (
    <div className="pin-modal-overlay" onClick={onClose}>
      <div className="pin-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="pin-modal-close" onClick={onClose} aria-label="סגור">×</button>
        <h3>אימות קוד PIN מנהל</h3>
        <p className="pin-modal-desc">הקש את קוד ה-PIN כדי להיכנס למצב מאשר/עריכה</p>
        
        <div className="pin-display">
          <div className="pin-dots">
            {Array.from({ length: Math.max(4, appData.settings.approverPin.length) }).map((_, i) => (
              <span 
                key={i} 
                className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}
              ></span>
            ))}
          </div>
          {error && <div className="pin-error-text">{error}</div>}
        </div>

        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              type="button" 
              className="keypad-btn" 
              onClick={() => handleKeyPress(num.toString())}
            >
              {num}
            </button>
          ))}
          <button 
            type="button" 
            className="keypad-btn btn-action" 
            onClick={handleClear}
          >
            נקה
          </button>
          <button 
            type="button" 
            className="keypad-btn" 
            onClick={() => handleKeyPress('0')}
          >
            0
          </button>
          <button 
            type="button" 
            className="keypad-btn btn-action" 
            onClick={handleBackspace}
          >
            ⌫
          </button>
        </div>
        
        <button type="button" className="btn btn-secondary pin-cancel-btn" onClick={onClose}>
          ביטול
        </button>
      </div>
    </div>
  );
};
