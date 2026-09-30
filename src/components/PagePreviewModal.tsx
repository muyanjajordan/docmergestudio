import React, { useEffect, useState } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { PdfPageItem } from '../types/pdf';

interface PagePreviewModalProps {
  page: PdfPageItem | null;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onRotate: (pageId: string, delta: number) => void;
  onDelete: (pageId: string) => void;
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({
  page,
  currentIndex,
  totalCount,
  onClose,
  onNavigate,
  onRotate,
  onDelete,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Reset zoom on page change
  useEffect(() => {
    setZoomLevel(1);
  }, [page?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        onNavigate('next');
      } else if (e.key === 'r' && page) {
        onRotate(page.id, 90);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, onRotate, page]);

  if (!page) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[90vh] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: page.fileColor }}
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-white truncate max-w-xs">{page.sourceFileName}</span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-400 font-mono">Original p.{page.originalPageNumber}</span>
              <span className="text-neutral-500">·</span>
              <span className="text-blue-400 font-mono font-medium">Position #{currentIndex + 1} of {totalCount}</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onRotate(page.id, -90)}
              title="Rotate counter-clockwise (R)"
              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRotate(page.id, 90)}
              title="Rotate clockwise (R)"
              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
              title="Zoom out"
              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-neutral-400 w-10 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              title="Zoom in"
              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            <button
              onClick={() => {
                onDelete(page.id);
                onClose();
              }}
              title="Delete page"
              className="p-1.5 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              title="Close modal (Esc)"
              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Preview Canvas */}
        <div className="relative flex-1 flex items-center justify-center p-6 overflow-auto bg-neutral-950">
          {/* Navigation Arrows */}
          <button
            onClick={() => onNavigate('prev')}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed shadow-lg transition-all z-20"
            title="Previous page (Left arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => onNavigate('next')}
            disabled={currentIndex === totalCount - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed shadow-lg transition-all z-20"
            title="Next page (Right arrow)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Rendered Document Page */}
          <div
            className="transition-transform duration-200 ease-out shadow-2xl rounded overflow-hidden bg-white max-h-[80vh] flex items-center justify-center"
            style={{
              transform: `scale(${zoomLevel}) rotate(${page.rotation}deg)`,
            }}
          >
            {page.thumbnailUrl ? (
              <img
                src={page.thumbnailUrl}
                alt={`${page.sourceFileName} p.${page.originalPageNumber}`}
                className="max-h-[75vh] w-auto object-contain select-none pointer-events-none"
              />
            ) : (
              <div className="p-12 text-neutral-400 text-sm">Rendering page content...</div>
            )}
          </div>
        </div>

        {/* Bottom Status Footnote */}
        <div className="px-5 py-2.5 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div>
            Native Dimensions: <span className="font-mono text-neutral-300">{page.width} × {page.height} pt</span>
            {page.rotation !== 0 && (
              <span className="ml-3 text-blue-400">Rotation: {page.rotation}°</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1 py-0.5 bg-neutral-800 rounded font-mono text-[10px]">←</kbd> <kbd className="px-1 py-0.5 bg-neutral-800 rounded font-mono text-[10px]">→</kbd> to browse</span>
            <span><kbd className="px-1 py-0.5 bg-neutral-800 rounded font-mono text-[10px]">R</kbd> rotate</span>
            <span><kbd className="px-1 py-0.5 bg-neutral-800 rounded font-mono text-[10px]">Esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
