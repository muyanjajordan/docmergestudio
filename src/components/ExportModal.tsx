import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileCheck,
  Eye,
  Loader2,
  ExternalLink,
  Stamp,
  Tag,
  Hash,
  ShieldAlert,
} from 'lucide-react';
import { ExportSettings, PdfPageItem } from '../types/pdf';
import { formatBytes, mergePdfPages } from '../utils/pdfHelper';

interface ExportModalProps {
  isOpen: boolean;
  pages: PdfPageItem[];
  fileBuffers: Map<string, ArrayBuffer>;
  selectedIds: Set<string>;
  estimatedSizeBytes: number;
  initialSettings: ExportSettings;
  onClose: () => void;
  onSuccess: (fileName: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  pages,
  fileBuffers,
  selectedIds,
  estimatedSizeBytes,
  initialSettings,
  onClose,
  onSuccess,
}) => {
  const [fileName, setFileName] = useState(initialSettings.fileName || 'merged_document.pdf');
  const [activeTab, setActiveTab] = useState<'settings' | 'watermark' | 'metadata' | 'preview'>('settings');

  // Page Numbers
  const [pageNumbersEnabled, setPageNumbersEnabled] = useState(initialSettings.pageNumbers.enabled);
  const [numberPosition, setNumberPosition] = useState(initialSettings.pageNumbers.position);
  const [numberFormat, setNumberFormat] = useState(initialSettings.pageNumbers.format);
  const [startFrom, setStartFrom] = useState(initialSettings.pageNumbers.startFrom || 1);
  const [skipFirstPage, setSkipFirstPage] = useState(initialSettings.pageNumbers.skipFirstPage || false);

  // Watermark
  const [watermarkEnabled, setWatermarkEnabled] = useState(initialSettings.watermark.enabled);
  const [watermarkText, setWatermarkText] = useState(initialSettings.watermark.text || 'CONFIDENTIAL');
  const [watermarkColor, setWatermarkColor] = useState(initialSettings.watermark.color || '#DC2626');
  const [watermarkOpacity, setWatermarkOpacity] = useState(initialSettings.watermark.opacity || 0.25);
  const [watermarkRotation, setWatermarkRotation] = useState(initialSettings.watermark.rotation || 45);
  const [watermarkApplyTo, setWatermarkApplyTo] = useState(initialSettings.watermark.applyTo || 'all');

  // Metadata
  const [metaTitle, setMetaTitle] = useState(initialSettings.metadata.title || '');
  const [metaAuthor, setMetaAuthor] = useState(initialSettings.metadata.author || '');
  const [metaSubject, setMetaSubject] = useState(initialSettings.metadata.subject || '');
  const [metaKeywords, setMetaKeywords] = useState(initialSettings.metadata.keywords || '');

  // Generation & preview state
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  if (!isOpen) return null;

  const currentSettings: ExportSettings = {
    fileName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
    pageSize: 'original',
    pageNumbers: {
      enabled: pageNumbersEnabled,
      position: numberPosition,
      format: numberFormat,
      startFrom,
      skipFirstPage,
    },
    watermark: {
      enabled: watermarkEnabled,
      text: watermarkText,
      color: watermarkColor,
      opacity: watermarkOpacity,
      fontSize: 48,
      rotation: watermarkRotation,
      applyTo: watermarkApplyTo,
    },
    metadata: {
      title: metaTitle,
      author: metaAuthor,
      subject: metaSubject,
      keywords: metaKeywords,
    },
  };

  const handleGeneratePreview = async () => {
    try {
      setIsGenerating(true);
      const mergedBytes = await mergePdfPages(fileBuffers, pages, currentSettings, selectedIds);
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setActiveTab('preview');
    } catch (err) {
      console.error('Failed to generate preview', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const mergedBytes = await mergePdfPages(fileBuffers, pages, currentSettings, selectedIds);
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const downloadName = fileName.trim().length > 0
        ? (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`)
        : 'merged_document.pdf';

      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 5000);

      onSuccess(downloadName);
      onClose();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Export Merged PDF</h2>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
              <span>{pages.length} Pages arranged</span>
              <span>·</span>
              <span>Estimated {formatBytes(estimatedSizeBytes)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-neutral-200 flex items-center gap-1 bg-white overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>General & Numbering</span>
          </button>

          <button
            onClick={() => setActiveTab('watermark')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'watermark'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>Watermark {watermarkEnabled && '●'}</span>
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'metadata'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Document Info</span>
          </button>

          {previewBlobUrl && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'preview' && previewBlobUrl ? (
            <div className="h-[460px] bg-neutral-900">
              <iframe
                src={previewBlobUrl}
                className="w-full h-full border-none"
                title="Merged PDF Document Preview"
              />
            </div>
          ) : activeTab === 'watermark' ? (
            /* Watermark Tab */
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900">Stamp Watermark</h4>
                  <p className="text-xs text-neutral-500">Overlay diagonal or horizontal watermark on sheets</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watermarkEnabled}
                    onChange={(e) => setWatermarkEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {watermarkEnabled && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div>
                    <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1.5">
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL, DRAFT, COPY"
                      className="w-full text-sm font-semibold px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                      {['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'SAMPLE'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setWatermarkText(preset)}
                          className="px-2 py-0.5 text-[11px] bg-neutral-100 hover:bg-neutral-200 rounded font-mono text-neutral-700 cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1.5">
                        Watermark Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={watermarkColor}
                          onChange={(e) => setWatermarkColor(e.target.value)}
                          className="w-8 h-8 rounded border border-neutral-300 cursor-pointer p-0.5"
                        />
                        <span className="text-xs font-mono text-neutral-600">{watermarkColor}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1.5">
                        Opacity ({Math.round(watermarkOpacity * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0.08"
                        max="0.8"
                        step="0.02"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1.5">
                        Rotation Angle
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: 'Diagonal 45°', val: 45 },
                          { label: 'Horizontal 0°', val: 0 },
                          { label: 'Angle -45°', val: -45 },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setWatermarkRotation(item.val)}
                            className={`py-1.5 px-2 text-[11px] font-medium rounded border cursor-pointer ${
                              watermarkRotation === item.val
                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                : 'border-neutral-200 text-neutral-600'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1.5">
                        Apply Scope
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWatermarkApplyTo('all')}
                          className={`py-1.5 px-2 text-[11px] font-medium rounded border cursor-pointer ${
                            watermarkApplyTo === 'all'
                              ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                              : 'border-neutral-200 text-neutral-600'
                          }`}
                        >
                          All Pages ({pages.length})
                        </button>
                        <button
                          type="button"
                          disabled={selectedIds.size === 0}
                          onClick={() => setWatermarkApplyTo('selected')}
                          className={`py-1.5 px-2 text-[11px] font-medium rounded border cursor-pointer disabled:opacity-40 ${
                            watermarkApplyTo === 'selected'
                              ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                              : 'border-neutral-200 text-neutral-600'
                          }`}
                        >
                          Selected ({selectedIds.size})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'metadata' ? (
            /* Document Metadata Tab */
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="e.g. Master Consolidated Report 2026"
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1">
                    Author / Organization
                  </label>
                  <input
                    type="text"
                    value={metaAuthor}
                    onChange={(e) => setMetaAuthor(e.target.value)}
                    placeholder="e.g. DocuMerge Studio"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1">
                    Subject / Category
                  </label>
                  <input
                    type="text"
                    value={metaSubject}
                    onChange={(e) => setMetaSubject(e.target.value)}
                    placeholder="e.g. Executive Summary & Audits"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1">
                  Search Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  placeholder="e.g. finance, agreement, 2026, audit"
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ) : (
            /* General & Numbering Tab */
            <div className="p-6 space-y-6">
              {/* Output File Name */}
              <div>
                <label htmlFor="filename-input" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Output File Name
                </label>
                <div className="flex items-center rounded-lg border border-neutral-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white px-3 py-2">
                  <input
                    id="filename-input"
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g. combined_report_2026.pdf"
                    className="w-full text-sm font-medium text-neutral-900 outline-none"
                  />
                  <span className="text-xs text-neutral-400 font-mono">.pdf</span>
                </div>
              </div>

              {/* Page Numbering Section */}
              <div className="border-t border-neutral-200 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">Stamp Continuous Page Numbers</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Automatically stamps typography onto every merged sheet.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageNumbersEnabled}
                      onChange={(e) => setPageNumbersEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {pageNumbersEnabled && (
                  <div className="mt-4 space-y-4 animate-in fade-in duration-100">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                        Numbering Format
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'page_x_of_y', label: 'Page 1 of 12' },
                          { id: 'x_of_y', label: '1 / 12' },
                          { id: 'dash_x', label: '- 1 -' },
                          { id: 'just_x', label: '1' },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setNumberFormat(fmt.id as any)}
                            className={`py-1.5 px-2 text-xs font-mono rounded border text-center transition-colors cursor-pointer ${
                              numberFormat === fmt.id
                                ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                                : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            {fmt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                        Stamp Position
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { id: 'bottom-center', label: 'Bottom Center' },
                          { id: 'bottom-right', label: 'Bottom Right' },
                          { id: 'bottom-left', label: 'Bottom Left' },
                          { id: 'top-center', label: 'Top Center' },
                          { id: 'top-right', label: 'Top Right' },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setNumberPosition(pos.id as any)}
                            className={`py-1.5 px-1 text-[11px] font-medium rounded border text-center transition-colors cursor-pointer ${
                              numberPosition === pos.id
                                ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold'
                                : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                        <input
                          type="checkbox"
                          checked={skipFirstPage}
                          onChange={(e) => setSkipFirstPage(e.target.checked)}
                          className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                        />
                        <span>Skip first page (treat Page 1 as cover sheet)</span>
                      </label>

                      <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                        <span>Start at:</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={startFrom}
                          onChange={(e) => setStartFrom(Math.max(1, Number(e.target.value)))}
                          className="w-12 px-1.5 py-0.5 text-center border border-neutral-300 rounded font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
          <div>
            {!previewBlobUrl ? (
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                <span>Preview Document</span>
              </button>
            ) : (
              <a
                href={previewBlobUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || pages.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Merging Pages...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Merged PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
