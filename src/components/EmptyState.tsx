import React, { useRef } from 'react';
import { Upload, Sparkles, FileText, ArrowRight, ShieldCheck, Shuffle, RotateCw } from 'lucide-react';

interface EmptyStateProps {
  onUploadFiles: (files: FileList | File[]) => void;
  onLoadSamples: () => void;
  isProcessing: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onUploadFiles,
  onLoadSamples,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-4xl mx-auto w-full">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
      />

      {/* Main Drag-and-drop landing card */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-neutral-300 hover:border-neutral-500 hover:bg-neutral-100/50 bg-white rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center shadow-xs"
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5 group-hover:scale-105 group-hover:bg-blue-100/70 transition-transform">
          <Upload className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
          Select or drop PDF files here
        </h2>
        <p className="text-sm text-neutral-500 max-w-md mt-2">
          Combine multiple PDF files into one clean document, reorder pages with drag and drop, rotate orientations, and export in seconds.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="px-5 py-2.5 text-xs font-semibold text-white bg-neutral-900 group-hover:bg-neutral-800 rounded-lg shadow-sm transition-colors"
          >
            Browse PDF Files
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLoadSamples();
            }}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Sample PDFs</span>
          </button>
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>No files leave your computer · 100% Client-Side WebAssembly Processing</span>
        </div>
      </div>

      {/* Feature capabilities grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 w-full text-left">
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 mb-3">
            <Shuffle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">Drag & Drop Rearranging</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Freely drag individual pages or multi-selected batches to create your custom page sequence.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 mb-3">
            <RotateCw className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">Rotate & Duplicate</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Fix upside-down scans with 90° clockwise/counter-clockwise rotation and clone pages as needed.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 mb-3">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">Merge & Stamp Numbers</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Export a single consolidated PDF with optional continuous page numbers (e.g. Page 1 of 12).
          </p>
        </div>
      </div>
    </div>
  );
};
