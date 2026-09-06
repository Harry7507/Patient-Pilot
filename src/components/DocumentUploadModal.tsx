import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Check, 
  Sparkles, 
  AlertCircle, 
  FileCheck2,
  Table,
  Pill,
  Activity
} from 'lucide-react';
import { DocumentExtraction } from '../types/clinical';
import { SAMPLE_DOCUMENTS, processMedicalDocument } from '../services/ocrService';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractSuccess: (extraction: DocumentExtraction) => void;
  geminiApiKey: string;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onExtractSuccess,
  geminiApiKey
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewExtraction, setPreviewExtraction] = useState<DocumentExtraction | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectSample = async (sampleId: string) => {
    setSelectedSampleId(sampleId);
    setSelectedFile(null);
    setIsLoading(true);
    try {
      const result = await processMedicalDocument(null, sampleId, geminiApiKey);
      setPreviewExtraction(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setSelectedSampleId('');
    setIsLoading(true);
    try {
      const result = await processMedicalDocument(file, undefined, geminiApiKey);
      setPreviewExtraction(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (previewExtraction) {
      onExtractSuccess(previewExtraction);
      onClose();
    }
  };

  return (
    <div className="emergency-overlay">
      <div 
        className="glass-card" 
        style={{ 
          maxWidth: '900px', 
          width: '95%', 
          maxHeight: '90vh', 
          background: 'var(--bg-surface-elevated)',
          border: '1.5px solid rgba(96, 165, 250, 0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}
      >
        {/* Modal Header */}
        <div style={{ 
          padding: '20px 28px', 
          borderBottom: '1px solid var(--border-glass)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #2563eb, #06b6d4)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white'
            }}>
              <FileCheck2 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Medical Document OCR & Data Extraction</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Upload prescriptions, lab investigations, or discharge summaries for automated intake parsing.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="kiosk-btn" 
            style={{ width: '38px', height: '38px', padding: 0, justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {/* Quick Demo Pre-sets for Instant Evaluation */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#93c5fd', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} />
              <span>Instant Test Records (One-click load for Kiosk Testing):</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {SAMPLE_DOCUMENTS.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectSample(doc.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: selectedSampleId === doc.id ? 'rgba(37, 99, 235, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    border: selectedSampleId === doc.id ? '1.5px solid #60a5fa' : '1px solid var(--border-glass)',
                    color: 'var(--text-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{doc.title}</span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      background: doc.type === 'Lab Report' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                      color: doc.type === 'Lab Report' ? '#fbbf24' : '#93c5fd'
                    }}>
                      {doc.type}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.medications.length > 0 ? `${doc.medications.length} meds extracted` : `${doc.keyLabValues.length} lab markers`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            style={{
              border: dragOver ? '2px dashed #60a5fa' : '2px dashed var(--border-glass)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              background: dragOver ? 'rgba(37, 99, 235, 0.1)' : 'rgba(15, 23, 42, 0.4)',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'all 0.2s'
            }}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input 
              id="file-upload-input" 
              type="file" 
              accept="image/*,.pdf" 
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <Upload size={32} color="#60a5fa" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {selectedFile ? `File: ${selectedFile.name}` : 'Drop prescription photo or tap to browse'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Supports JPG, PNG, Medical Scans (Auto-enhanced for Kiosk Camera)
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(96,165,250,0.3)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#93c5fd' }}>
                Analyzing medical document and reconciling clinical entities...
              </div>
            </div>
          )}

          {/* Extraction Preview Results */}
          {previewExtraction && !isLoading && (
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '14px', padding: '18px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#38bdf8' }}>
                  Extracted Clinical Findings ({previewExtraction.documentType})
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Processed: {previewExtraction.extractedAt}
                </span>
              </div>

              {/* Extracted Medications */}
              {previewExtraction.medications.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Pill size={14} /> Active Medications Reconciled:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {previewExtraction.medications.map((med, i) => (
                      <div key={i} style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.82rem' }}>
                        <strong>{med.name}</strong> {med.dosage} • <span style={{ color: '#6ee7b7' }}>{med.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Key Labs */}
              {previewExtraction.keyLabValues.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fde047', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Activity size={14} /> Lab Values & Abnormal Markers:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {previewExtraction.keyLabValues.map((lab, i) => (
                      <div key={i} style={{ 
                        background: lab.status === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(30, 41, 59, 0.6)', 
                        border: lab.status === 'CRITICAL' ? '1px solid #ef4444' : '1px solid var(--border-glass)',
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        fontSize: '0.82rem' 
                      }}>
                        <div style={{ fontWeight: 600 }}>{lab.test_name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: lab.status === 'CRITICAL' ? '#f87171' : '#f8fafc' }}>
                            {lab.result} {lab.reference_unit}
                          </span>
                          <span className={`lab-status-badge ${lab.status === 'CRITICAL' ? 'lab-status-critical' : lab.status === 'HIGH' ? 'lab-status-high' : 'lab-status-normal'}`}>
                            {lab.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnoses */}
              {previewExtraction.diagnosesOrPastProcedures.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#93c5fd', marginBottom: '6px' }}>
                    Documented Diagnoses / Procedures:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {previewExtraction.diagnosesOrPastProcedures.map((diag, i) => (
                      <span key={i} style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        {diag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ 
          padding: '16px 28px', 
          borderTop: '1px solid var(--border-glass)', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px' 
        }}>
          <button className="kiosk-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="kiosk-btn kiosk-btn-primary" 
            disabled={!previewExtraction}
            onClick={handleConfirm}
            style={{ opacity: previewExtraction ? 1 : 0.5 }}
          >
            <Check size={18} />
            <span>Confirm & Merge into Intake</span>
          </button>
        </div>
      </div>
    </div>
  );
};
