import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Volume2, 
  VolumeX, 
  Globe, 
  Leaf, 
  ClipboardCheck, 
  Sliders, 
  Clock, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { LanguageCode } from '../types/clinical';

interface KioskHeaderProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  isAyushActive: boolean;
  onToggleAyush: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  viewMode: 'kiosk' | 'clinician';
  onToggleViewMode: () => void;
  onOpenSettings: () => void;
  onResetSession: () => void;
  hasEmergency: boolean;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({
  language,
  onLanguageChange,
  isAyushActive,
  onToggleAyush,
  voiceEnabled,
  onToggleVoice,
  viewMode,
  onToggleViewMode,
  onOpenSettings,
  onResetSession,
  hasEmergency
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="kiosk-header">
      {/* Brand & Kiosk Station Info */}
      <div className="brand-badge">
        <div className="brand-icon">
          <Stethoscope size={26} strokeWidth={2.4} />
        </div>
        <div>
          <div className="brand-title">PatientPilot</div>
          <div className="brand-subtitle">
            OPD Intake & Triage Station #04 • AI Pre-Consultation
          </div>
        </div>
      </div>

      {/* Center Live Station Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(30, 41, 59, 0.7)', 
          padding: '6px 14px', 
          borderRadius: '20px', 
          fontSize: '0.85rem',
          color: '#cbd5e1'
        }}>
          <Clock size={16} color="#60a5fa" />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{currentTime}</span>
        </div>

        {hasEmergency && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid #ef4444',
            color: '#f87171',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700,
            animation: 'emergencyPulse 1.5s infinite'
          }}>
            <AlertTriangle size={16} />
            <span>RED FLAG ACTIVE</span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="kiosk-controls">
        {/* Language Selector */}
        <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: '12px', padding: '3px', border: '1px solid var(--border-glass)' }}>
          <button 
            className={`kiosk-btn ${language === 'en' ? 'kiosk-btn-primary' : ''}`}
            style={{ height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '9px', border: 'none' }}
            onClick={() => onLanguageChange('en')}
          >
            EN
          </button>
          <button 
            className={`kiosk-btn ${language === 'hi' ? 'kiosk-btn-primary' : ''}`}
            style={{ height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '9px', border: 'none' }}
            onClick={() => onLanguageChange('hi')}
          >
            हिन्दी
          </button>
          <button 
            className={`kiosk-btn ${language === 'bn' ? 'kiosk-btn-primary' : ''}`}
            style={{ height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '9px', border: 'none' }}
            onClick={() => onLanguageChange('bn')}
          >
            বাংলা
          </button>
        </div>

        {/* AYUSH Mode Switch */}
        <button
          className={`kiosk-btn ayush-toggle ${isAyushActive ? 'active' : ''}`}
          onClick={onToggleAyush}
          title="Toggle AYUSH / Dashavidha Pariksha Intake Protocol"
        >
          <Leaf size={18} />
          <span>AYUSH Mode</span>
          {isAyushActive && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.25)', borderRadius: '6px' }}>ON</span>}
        </button>

        {/* Voice Prompter Toggle */}
        <button
          className="kiosk-btn"
          onClick={onToggleVoice}
          title={voiceEnabled ? 'Mute Voice Prompter' : 'Enable Voice Prompter'}
        >
          {voiceEnabled ? <Volume2 size={18} color="#38bdf8" /> : <VolumeX size={18} color="#94a3b8" />}
          <span>{voiceEnabled ? 'Audio ON' : 'Muted'}</span>
        </button>

        {/* Clinician Briefing vs Patient Intake Toggle */}
        <button
          className={`kiosk-btn ${viewMode === 'clinician' ? 'kiosk-btn-primary' : ''}`}
          onClick={onToggleViewMode}
        >
          <ClipboardCheck size={18} />
          <span>{viewMode === 'clinician' ? 'Patient Intake' : 'Doctor Briefing'}</span>
        </button>

        {/* Reset Session */}
        <button 
          className="kiosk-btn" 
          onClick={onResetSession}
          title="Reset Kiosk Session for Next Patient"
        >
          <RotateCcw size={16} />
        </button>

        {/* Settings */}
        <button className="kiosk-btn" onClick={onOpenSettings} title="Settings & Gemini API Config">
          <Sliders size={18} />
        </button>
      </div>
    </header>
  );
};
