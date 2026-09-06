import React, { useState } from 'react';
import { X, Key, Shield, Volume2, Save, CheckCircle2 } from 'lucide-react';
import { speechService } from '../services/speechService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiApiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  geminiApiKey,
  onSaveApiKey
}) => {
  const [keyInput, setKeyInput] = useState<string>(geminiApiKey);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const handleTestAudio = () => {
    speechService.speak('PatientPilot Audio System is functioning normally on this OPD Kiosk.', 'en');
  };

  return (
    <div className="emergency-overlay">
      <div 
        className="glass-card" 
        style={{ 
          maxWidth: '560px', 
          width: '90%', 
          background: 'var(--bg-surface-elevated)',
          border: '1.5px solid var(--border-glass)'
        }}
      >
        <div style={{ 
          padding: '18px 24px', 
          borderBottom: '1px solid var(--border-glass)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} color="#60a5fa" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Kiosk Terminal Settings</h3>
          </div>
          <button onClick={onClose} className="kiosk-btn" style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Gemini API Key */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Key size={16} color="#60a5fa" />
              <span>Google Gemini API Key (Optional for live Multimodal OCR):</span>
            </label>
            <input 
              type="password" 
              placeholder="AIzaSy..." 
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="kiosk-text-input" 
              style={{ width: '100%', height: '48px', fontSize: '0.9rem' }}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              When left blank, PatientPilot seamlessly uses its built-in offline clinical parser and sample records.
            </p>
          </div>

          {/* Kiosk Voice Test */}
          <div style={{ marginBottom: '20px', padding: '14px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Audio Prompter System</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>Test text-to-speech speaker volume</div>
              </div>
              <button className="kiosk-btn" onClick={handleTestAudio} style={{ height: '36px', fontSize: '0.8rem' }}>
                <Volume2 size={16} />
                <span>Test Voice</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="kiosk-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="kiosk-btn kiosk-btn-primary" onClick={handleSave}>
              {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
