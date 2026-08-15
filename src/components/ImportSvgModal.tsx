import React, { useState } from 'react';
import { X, Upload, Code } from 'lucide-react';

interface ImportSvgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (svgData: string) => void;
}

export const ImportSvgModal: React.FC<ImportSvgModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [svgString, setSvgString] = useState('');

  if (!isOpen) return null;

  const handleImport = () => {
    onImport(svgString);
    setSvgString('');
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onImport(content);
        onClose();
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-paper)] border border-[var(--color-hairline)] w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-hairline)] bg-[var(--color-surface-alt)]">
          <h2 className="text-base font-semibold text-[var(--color-ink)] flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import SVG Path
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--color-mid-gray)] hover:bg-[var(--color-canvas)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-hairline)]">
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'paste' 
                ? 'text-[var(--color-ink)] border-b-2 border-[var(--color-ink)] bg-[var(--color-canvas)]' 
                : 'text-[var(--color-mid-gray)] hover:bg-[var(--color-surface-alt)]'
            }`}
          >
            Paste SVG / Path Data
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'file' 
                ? 'text-[var(--color-ink)] border-b-2 border-[var(--color-ink)] bg-[var(--color-canvas)]' 
                : 'text-[var(--color-mid-gray)] hover:bg-[var(--color-surface-alt)]'
            }`}
          >
            Upload .SVG File
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1">
          {activeTab === 'paste' ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-mid-gray)] leading-relaxed">
                Paste raw <code className="bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded text-xs">d="..."</code> path strings, or full <code className="bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded text-xs">&lt;svg&gt;</code> tags containing paths. VectorFlow will automatically parse and convert them to editable anchor points.
              </p>
              <textarea
                value={svgString}
                onChange={(e) => setSvgString(e.target.value)}
                placeholder="M 10 10 C 20 20, 40 20, 50 10 Z&#10;or&#10;<svg><path d='...' /></svg>"
                className="w-full h-40 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[12px] p-3 text-xs text-[var(--color-ink)] font-mono focus:outline-none focus:border-[#00F2FF] resize-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-[var(--color-hairline)] rounded-[12px] bg-[var(--color-surface-alt)]">
              <Upload className="w-8 h-8 text-[var(--color-mid-gray)] mb-3" />
              <p className="text-sm font-medium text-[var(--color-ink)] mb-1">Select an SVG file to import</p>
              <p className="text-xs text-[var(--color-mid-gray)] mb-4">Supports multi-path vector shapes</p>
              <label className="cursor-pointer bg-[var(--color-ink)] text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
                Browse Files
                <input type="file" accept=".svg" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'paste' && (
          <div className="p-4 border-t border-[var(--color-hairline)] bg-[var(--color-surface-alt)] flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-canvas)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!svgString.trim()}
              className="px-6 py-2 rounded-full bg-[var(--color-ink)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--color-ink)]/90 transition-colors flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              Import Vectors
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
