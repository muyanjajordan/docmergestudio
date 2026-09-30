import React, { useState } from 'react';
import {
  X,
  Scissors,
  Archive,
  FileText,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ExportSettings, PdfPageItem, SplitOptions } from '../types/pdf';
import { splitAndExportPdf } from '../utils/pdfHelper';

interface SplitModalProps {
  isOpen: boolean;
  pages: PdfPageItem[];
  fileBuffers: Map<string, ArrayBuffer>;
  selectedIds: Set<string>;
  exportSettings: ExportSettings;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  pages,
  fileBuffers,
  selectedIds,
  exportSettings,
  onClose,
  onSuccess,
}) => {
  const [splitMode, setSplitMode] = useState<SplitOptions['mode']>(
    selectedIds.size > 0 ? 'selected_only' : 'single_pages'
  );
  const [everyN, setEveryN] = useState<number>(2);
  const [zipName, setZipName] = useState<string>('split_documents.zip');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');

  if (!isOpen) return null;

  const handleExecuteSplit = async () => {
    try {
      setIsProcessing(true);
      const options: SplitOptions = {
        mode: splitMode,
        everyN,
        zipFileName: zipName.endsWith('.zip') ? zipName : `${zipName}.zip`,
      };

      const result = await splitAndExportPdf(
        fileBuffers,
        pages,
        options,
        exportSettings,
        selectedIds,
        (msg) => setProgressStatus(msg)
      );

      if (result.singlePdfBytes) {
        // Download single PDF
        const blob = new Blob([result.singlePdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        onSuccess(`Extracted ${result.count} selected pages into "${result.fileName}"`);
      } else if (result.zipBlob) {
        // Download ZIP
        const url = URL.createObjectURL(result.zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        onSuccess(`Created ZIP archive with ${result.count} documents: "${result.fileName}"`);
      }

      onClose();
    } catch (err: any) {
      console.error('Split error', err);
      alert(err.message || 'Failed to split document');
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
    }
  };

  const getExpectedOutputCount = () => {
    switch (splitMode) {
      case 'selected_only':
        return `${selectedIds.size} page(s) into 1 PDF`;
      case 'single_pages':
        return `${pages.length} separate PDF files (.zip)`;
      case 'every_n_pages':
        return `${Math.ceil(pages.length / Math.max(1, everyN))} PDF parts (.zip)`;
      case 'by_document': {
        const uniqueDocs = new Set(pages.map((p) => p.sourceFileId)).size;
        return `${uniqueDocs} organized PDF files (.zip)`;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Split & Extract PDF</h2>
              <p className="text-xs text-neutral-500">Divide workspace pages into separate documents or ZIP</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block">
              Choose Split Method
            </label>

            {/* Option 1: Selected only */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                splitMode === 'selected_only'
                  ? 'border-blue-600 bg-blue-50/40 text-neutral-900 ring-1 ring-blue-500/20'
                  : 'border-neutral-200 hover:bg-neutral-50/80 text-neutral-700'
              } ${selectedIds.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="splitMode"
                value="selected_only"
                disabled={selectedIds.size === 0}
                checked={splitMode === 'selected_only'}
                onChange={() => setSplitMode('selected_only')}
                className="mt-0.5 text-blue-600 accent-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Extract Selected Pages Only</span>
                  <span className="text-[11px] font-mono text-blue-600 bg-blue-100/60 px-1.5 py-0.2 rounded">
                    {selectedIds.size} selected
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Exports a single new PDF containing only the pages currently checked.
                </p>
              </div>
            </label>

            {/* Option 2: Single pages */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                splitMode === 'single_pages'
                  ? 'border-blue-600 bg-blue-50/40 text-neutral-900 ring-1 ring-blue-500/20'
                  : 'border-neutral-200 hover:bg-neutral-50/80 text-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="splitMode"
                value="single_pages"
                checked={splitMode === 'single_pages'}
                onChange={() => setSplitMode('single_pages')}
                className="mt-0.5 text-blue-600 accent-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Separate Every Page (1 page per PDF)</span>
                  <span className="text-[11px] font-mono text-neutral-500">{pages.length} files</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Creates page_001.pdf, page_002.pdf, etc., packed into a clean ZIP archive.
                </p>
              </div>
            </label>

            {/* Option 3: Every N pages */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                splitMode === 'every_n_pages'
                  ? 'border-blue-600 bg-blue-50/40 text-neutral-900 ring-1 ring-blue-500/20'
                  : 'border-neutral-200 hover:bg-neutral-50/80 text-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="splitMode"
                value="every_n_pages"
                checked={splitMode === 'every_n_pages'}
                onChange={() => setSplitMode('every_n_pages')}
                className="mt-0.5 text-blue-600 accent-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Split Every N Pages (Chunks)</span>
                  {splitMode === 'every_n_pages' && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-neutral-500">Every</span>
                      <input
                        type="number"
                        min="1"
                        max={pages.length}
                        value={everyN}
                        onChange={(e) => setEveryN(Math.max(1, Number(e.target.value)))}
                        className="w-12 px-1.5 py-0.5 text-xs text-center border border-neutral-300 rounded font-mono"
                      />
                      <span className="text-[11px] text-neutral-500">pages</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Divides the document sequence into equal-sized PDF chapters inside a ZIP.
                </p>
              </div>
            </label>

            {/* Option 4: By source document */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                splitMode === 'by_document'
                  ? 'border-blue-600 bg-blue-50/40 text-neutral-900 ring-1 ring-blue-500/20'
                  : 'border-neutral-200 hover:bg-neutral-50/80 text-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="splitMode"
                value="by_document"
                checked={splitMode === 'by_document'}
                onChange={() => setSplitMode('by_document')}
                className="mt-0.5 text-blue-600 accent-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Split by Source Document</span>
                  <span className="text-[11px] font-mono text-neutral-500">Reorganized files</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Exports each original document separately with its newly rearranged page order.
                </p>
              </div>
            </label>
          </div>

          {/* Expected output preview banner */}
          <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 flex items-center justify-between text-xs">
            <span className="text-neutral-600 flex items-center gap-1.5 font-medium">
              <Archive className="w-3.5 h-3.5 text-neutral-400" />
              <span>Resulting Output:</span>
            </span>
            <span className="font-semibold text-neutral-900 font-mono">
              {getExpectedOutputCount()}
            </span>
          </div>

          {/* ZIP file name if ZIP mode */}
          {splitMode !== 'selected_only' && (
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                ZIP Archive File Name
              </label>
              <input
                type="text"
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:border-blue-500"
                placeholder="split_documents.zip"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {isProcessing && progressStatus ? (
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{progressStatus}</span>
              </span>
            ) : (
              <span>100% Client-Side generation</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleExecuteSplit}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{splitMode === 'selected_only' ? 'Extract Pages' : 'Generate & Download ZIP'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
