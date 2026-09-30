import React from 'react';
import {
  Download,
  Sparkles,
  Trash2,
  ShieldCheck,
  FileCheck,
  Scissors,
  PlusCircle,
  Columns2,
} from 'lucide-react';
import { formatBytes } from '../utils/pdfHelper';

interface HeaderProps {
  totalFiles: number;
  totalPages: number;
  totalSizeBytes: number;
  isProcessing: boolean;
  onLoadSamples: () => void;
  onClearAll: () => void;
  onOpenSplit: () => void;
  onOpenInsertPage: () => void;
  onOpenCompare: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalFiles,
  totalPages,
  totalSizeBytes,
  isProcessing,
  onLoadSamples,
  onClearAll,
  onOpenSplit,
  onOpenInsertPage,
  onOpenCompare,
  onOpenExport,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 h-14 flex items-center justify-between transition-colors">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a href="/" className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          DocuMerge Studio
        </a>
        <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-neutral-500 font-normal pl-2 border-l border-neutral-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local In-Browser Processing</span>
        </span>
      </div>

      {/* Zone 2: Document stats */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-neutral-500 font-medium">
        {totalPages > 0 ? (
          <>
            <span className="flex items-center gap-1 text-neutral-700">
              <FileCheck className="w-3.5 h-3.5 text-neutral-400" />
              <strong className="font-semibold text-neutral-900 tabular-nums">{totalPages}</strong> {totalPages === 1 ? 'Page' : 'Pages'}
            </span>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <span>
              <strong className="font-semibold text-neutral-900 tabular-nums">{totalFiles}</strong> {totalFiles === 1 ? 'Source Document' : 'Source Documents'}
            </span>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <span className="tabular-nums">{formatBytes(totalSizeBytes)}</span>
          </>
        ) : (
          <span>Drag and drop PDFs to begin merging and reordering</span>
        )}
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {totalPages === 0 ? (
          <button
            onClick={onLoadSamples}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Load 3 sample PDFs with financial, tech, and legal pages"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Load Sample PDFs</span>
            <span className="sm:hidden">Samples</span>
          </button>
        ) : (
          <>
            {/* Quick feature buttons */}
            <button
              onClick={onOpenInsertPage}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              title="Insert a blank page or image"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden xl:inline">Insert Page</span>
            </button>

            <button
              onClick={onOpenCompare}
              disabled={totalPages < 2 || isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Compare two pages side-by-side or crossfade revisions"
            >
              <Columns2 className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden xl:inline">Compare</span>
            </button>

            <button
              onClick={onOpenSplit}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              title="Split into single pages or extract selected pages"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Split / Extract</span>
            </button>

            <button
              onClick={onClearAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Clear workspace"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <button
          onClick={onOpenExport}
          disabled={totalPages === 0 || isProcessing}
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Merged</span>
          {totalPages > 0 && (
            <span className="bg-neutral-700 text-neutral-200 text-[10px] px-1.5 py-0.2 rounded font-mono tabular-nums">
              {totalPages}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
