import React, { useState, useMemo } from 'react';
import { Globe, Search, X, Check, MapPin, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types/clinical';
import { INDIAN_LANGUAGES, LanguageMeta, LanguageZone } from '../constants/languages';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  currentLanguage,
  onSelectLanguage,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<LanguageZone>('All');

  const filteredLanguages = useMemo(() => {
    return INDIAN_LANGUAGES.filter((item) => {
      // Zone filter
      if (selectedZone === 'Popular' && !item.isPopular) return false;
      if (selectedZone !== 'All' && selectedZone !== 'Popular' && item.zone !== selectedZone) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(query) ||
        item.nativeName.toLowerCase().includes(query) ||
        item.region.toLowerCase().includes(query) ||
        item.code.toLowerCase() === query
      );
    });
  }, [searchQuery, selectedZone]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        style={{ 
          maxWidth: '860px', 
          width: '95%', 
          maxHeight: '90vh',
          display: 'flex', 
          flexDirection: 'column',
          padding: '28px',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(244, 114, 182, 0.35)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(236, 72, 153, 0.25)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ec4899 0%, #0ea5e9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(236, 72, 153, 0.45)'
            }}>
              <Globe size={28} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Select Patient Intake Language
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  background: 'rgba(56, 189, 248, 0.2)', 
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)'
                }}>
                  23 Languages of India
                </span>
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '2px' }}>
                All 22 officially scheduled Indian languages + English supported for voice, touch, and clinical intake.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="kiosk-btn"
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '14px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: 0,
              border: '1px solid var(--border-glass)'
            }}
            title="Close Language Selector"
          >
            <X size={20} color="#94a3b8" />
          </button>
        </div>

        {/* Search Bar & Zone Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search 
              size={18} 
              color="#94a3b8" 
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input
              type="text"
              placeholder="Search language in English or native script (e.g., Hindi, తెలుగు, தமிழ், Bengali, Marathi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="kiosk-text-input"
              style={{ 
                width: '100%', 
                height: '48px', 
                paddingLeft: '46px', 
                fontSize: '0.95rem',
                borderRadius: '14px',
                background: 'rgba(22, 34, 59, 0.75)',
                border: '1px solid rgba(244, 114, 182, 0.25)'
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Zone Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {(['All', 'Popular', 'South', 'North & Central', 'East & North-East', 'West'] as LanguageZone[]).map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`kiosk-btn ${selectedZone === zone ? 'kiosk-btn-primary' : ''}`}
                style={{
                  height: '34px',
                  padding: '0 14px',
                  fontSize: '0.8rem',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  border: selectedZone === zone ? 'none' : '1px solid var(--border-glass)'
                }}
              >
                {zone === 'Popular' && <Sparkles size={13} style={{ marginRight: '5px' }} />}
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Language Grid */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '12px',
          paddingRight: '6px',
          marginRight: '-6px'
        }}>
          {filteredLanguages.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No matching languages found for "{searchQuery}"</p>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Try searching in English (e.g. Punjabi, Telugu) or native script.</p>
            </div>
          ) : (
            filteredLanguages.map((lang: LanguageMeta) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    onSelectLanguage(lang.code);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: isSelected 
                      ? '2px solid #f472b6' 
                      : '1px solid rgba(244, 114, 182, 0.15)',
                    background: isSelected 
                      ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(14, 165, 233, 0.2) 100%)' 
                      : 'rgba(22, 34, 59, 0.65)',
                    boxShadow: isSelected 
                      ? '0 0 20px rgba(236, 72, 153, 0.35)' 
                      : 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(22, 34, 59, 0.95)';
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(22, 34, 59, 0.65)';
                      e.currentTarget.style.borderColor = 'rgba(244, 114, 182, 0.15)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 800, 
                      color: isSelected ? '#ffffff' : '#f8fafc',
                      fontFamily: 'var(--font-sans)'
                    }}>
                      {lang.nativeName}
                    </span>
                    {isSelected && (
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ec4899',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 10px #ec4899'
                      }}>
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: isSelected ? '#f472b6' : '#cbd5e1' }}>
                      {lang.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px' }}>
                      {lang.code.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.74rem', color: '#94a3b8' }}>
                    <MapPin size={12} color="#38bdf8" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {lang.region}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '18px', 
          paddingTop: '14px', 
          borderTop: '1px solid var(--border-glass)' 
        }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Current Active Language: <strong style={{ color: '#f472b6' }}>{INDIAN_LANGUAGES.find(l => l.code === currentLanguage)?.name || 'English'} ({INDIAN_LANGUAGES.find(l => l.code === currentLanguage)?.nativeName})</strong>
          </span>

          <button
            onClick={onClose}
            className="kiosk-btn kiosk-btn-primary"
            style={{ height: '42px', padding: '0 24px', borderRadius: '12px', fontSize: '0.88rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
