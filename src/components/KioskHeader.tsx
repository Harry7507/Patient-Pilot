import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Volume2,
  VolumeX,
  Leaf,
  ClipboardCheck,
  Sliders,
  Clock,
  AlertTriangle,
  RotateCcw,
  Phone,
  MapPin,
  CalendarCheck,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { LanguageCode } from '../types/clinical';
import { LanguageDropdown } from './LanguageDropdown';

interface KioskHeaderProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  isAyushActive: boolean;
  onToggleAyush: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onLogout?: () => void;
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
  onLogout,
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
    <header className="portal-header-wrapper" style={{ width: '100%', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      {/* Tier 1: MedicalFunc Top Contact Bar */}
      <div className="top-contact-banner" style={{
        background: 'var(--text-dark, #252B42)',
        color: '#ffffff',
        padding: '7px 24px',
        fontSize: '0.80rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={13} color="var(--primary-blue, #23A6F0)" />
            <span>Call Us: <strong>1-800-PATIENT-PILOT</strong></span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={13} color="var(--primary-blue, #23A6F0)" />
            <span>National Health AI Station Wing B</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} color="var(--primary-blue, #23A6F0)" />
            <span>OPD Hours: Mon - Sat 8:00am - 8:00pm</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {hasEmergency && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#E74040',
              color: '#ffffff',
              padding: '2px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              animation: 'emergencyPulse 1.5s infinite'
            }}>
              <AlertTriangle size={13} />
              <span>RED FLAG ACTIVE</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9 }}>
            <Clock size={13} color="var(--primary-blue, #23A6F0)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Tier 2: Crisp White Navigation Bar matching reference */}
      <div className="kiosk-header" style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 4px 18px -2px rgba(37, 43, 66, 0.06)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 0,
        margin: 0
      }}>
        {/* Brand Logo & Station Title */}
        <div className="brand-badge">
          <div className="brand-icon" style={{
            background: 'var(--primary-blue, #23A6F0)',
            color: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 4px 14px rgba(35, 166, 240, 0.35)'
          }}>
            <Stethoscope size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div className="brand-title" style={{ color: 'var(--text-dark, #252B42)', fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.45rem' }}>
              PATIENT<span style={{ color: 'var(--primary-blue, #23A6F0)' }}>PILOT</span>
            </div>
            <div className="brand-subtitle" style={{ color: 'var(--text-gray, #737373)', fontWeight: 500, fontSize: '0.75rem' }}>
              OPD Intake & Triage Portal #04 • Autonomous Pre-Consultation
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="kiosk-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Interactive Language Dropdown Menu (Requested by User) */}
          <LanguageDropdown
            currentLanguage={language}
            onSelectLanguage={onLanguageChange}
          />

          {/* AYUSH Mode Switch */}
          <button
            className={`kiosk-btn ayush-toggle ${isAyushActive ? 'active' : ''}`}
            onClick={onToggleAyush}
            style={{ height: '42px', borderRadius: '8px', fontSize: '0.82rem' }}
            title="Toggle AYUSH / Dashavidha Pariksha Intake Protocol"
          >
            <Leaf size={16} />
            <span>AYUSH Pariksha</span>
            {isAyushActive && <span style={{ fontSize: '0.68rem', padding: '1px 5px', background: 'rgba(255,255,255,0.25)', borderRadius: '4px' }}>ON</span>}
          </button>

          {/* Voice Audio Prompter */}
          <button
            className="kiosk-btn"
            onClick={onToggleVoice}
            style={{ height: '42px', borderRadius: '8px', fontSize: '0.82rem' }}
            title={voiceEnabled ? 'Mute Voice Prompter' : 'Enable Voice Prompter'}
          >
            {voiceEnabled ? <Volume2 size={16} color="var(--primary-blue, #23A6F0)" /> : <VolumeX size={16} color="#94a3b8" />}
            <span>{voiceEnabled ? 'Audio ON' : 'Muted'}</span>
          </button>

          {/* Real Log Out Action */}
          <button
            className="kiosk-btn"
            onClick={onLogout}
            style={{
              height: '42px',
              padding: '0 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              cursor: 'pointer'
            }}
            title="Log out of PatientPilot"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>

          {/* Reset Session */}
          <button
            className="kiosk-btn"
            onClick={onResetSession}
            style={{ height: '42px', width: '42px', padding: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Reset Portal Session for Next Patient"
          >
            <RotateCcw size={15} color="#737373" />
          </button>

          {/* Settings */}
          <button
            className="kiosk-btn"
            onClick={onOpenSettings}
            style={{ height: '42px', width: '42px', padding: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Settings & Gemini API Config"
          >
            <Sliders size={15} color="#737373" />
          </button>
        </div>
      </div>
    </header>
  );
};

