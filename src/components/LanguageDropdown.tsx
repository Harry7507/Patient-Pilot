import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Search, X } from 'lucide-react';
import { LanguageCode } from '../types/clinical';
import { INDIAN_LANGUAGES, getLanguageMeta } from '../constants/languages';

interface LanguageDropdownProps {
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  currentLanguage,
  onSelectLanguage
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMeta = getLanguageMeta(currentLanguage);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filter languages
  const filteredLanguages = INDIAN_LANGUAGES.filter((lang) => {
    const matchesSearch =
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesZone =
      selectedZone === 'All' ||
      (selectedZone === 'Popular' && lang.isPopular) ||
      lang.zone === selectedZone;

    return matchesSearch && matchesZone;
  });

  return (
    <div className="language-dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Dropdown Trigger Button styled after MedicalFunc modern aesthetic */}
      <button
        type="button"
        className="language-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Change language (23 Indian Languages supported)"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="lang-trigger-icon">
            <Globe size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-dark, #252B42)' }}>
              {currentMeta.nativeName}
            </span>
            <span style={{ fontSize: '0.70rem', color: 'var(--text-gray, #737373)', fontWeight: 500 }}>
              {currentMeta.name} ({currentMeta.code.toUpperCase()})
            </span>
          </div>
        </div>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--primary-blue, #23A6F0)', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="language-dropdown-menu">
          {/* Dropdown Header */}
          <div className="lang-menu-header">
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark, #252B42)' }}>
                Select Language
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-gray, #737373)' }}>
                23 Official Scheduled Languages of India
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-gray, #737373)',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="lang-search-box">
            <Search size={15} color="var(--primary-blue, #23A6F0)" />
            <input
              type="text"
              placeholder="Search language, script, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={13} color="#94a3b8" />
              </button>
            )}
          </div>

          {/* Zone Quick Filters */}
          <div className="lang-zone-pills">
            {['All', 'Popular', 'South', 'North & Central', 'East & North-East', 'West'].map((zone) => (
              <button
                key={zone}
                className={`lang-zone-pill ${selectedZone === zone ? 'active' : ''}`}
                onClick={() => setSelectedZone(zone)}
              >
                {zone}
              </button>
            ))}
          </div>

          {/* Scrollable Language Grid / List */}
          <div className="lang-items-grid">
            {filteredLanguages.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-gray, #737373)', fontSize: '0.85rem' }}>
                No languages found matching "{searchQuery}"
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <button
                    key={lang.code}
                    className={`lang-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onSelectLanguage(lang.code);
                      setIsOpen(false);
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="lang-native-title">{lang.nativeName}</span>
                        <span className="lang-code-tag">{lang.code.toUpperCase()}</span>
                      </div>
                      <span className="lang-english-title">{lang.name}</span>
                      <span className="lang-region-text" title={lang.region}>{lang.region}</span>
                    </div>

                    {isSelected && (
                      <div className="lang-selected-check">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
