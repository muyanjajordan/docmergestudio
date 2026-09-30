import React, { useState } from 'react';
import {
  X,
  Columns2,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
} from 'lucide-react';
import { PdfPageItem } from '../types/pdf';

interface CompareModalProps {
  isOpen: boolean;
  pages: PdfPageItem[];
  initialPageA?: PdfPageItem;
  initialPageB?: PdfPageItem;
  onClose: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  pages,
  initialPageA,
  initialPageB,
  onClose,
}) => {
  const [pageAId, setPageAId] = useState<string>(
    initialPageA?.id || pages[0]?.id || ''
  );
  const [pageBId, setPageBId] = useState<string>(
    initialPageB?.id || pages[1]?.id || pages[0]?.id || ''
  );
  const [viewStyle, setViewStyle] = useState<'split' | 'overlay'>('split');
  const [overlayAlpha, setOverlayAlpha] = useState<number>(50); // 0 to 100%
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!isOpen || pages.length === 0) return null;

  const pageA = pages.find((p) => p.id === pageAId) || pages[0];
  const pageB = pages.find((p) => p.id === pageBId) || pages[Math.min(1, pages.length - 1)];

  const pageAIndex = pages.findIndex((p) => p.id === pageA.id);
  const pageBIndex = pages.findIndex((p) => p.id === pageB.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl h-[90vh] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 text-blue-400 flex items-center justify-center">
              <Columns2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Compare Document Pages</h2>
              <p className="text-xs text-neutral-400">Inspect differences side-by-side or crossfade revisions</p>
            </div>
          </div>

          {/* Mode Switcher & Zoom */}
          <div className="flex items-center gap-3">
            {/* View style toggle */}
            <div className="flex items-center p-0.5 bg-neutral-800 rounded-lg text-xs font-medium">
              <button
                onClick={() => setViewStyle('split')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  viewStyle === 'split' ? 'bg-neutral-700 text-white shadow-2xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
              <button
                onClick={() => setViewStyle('overlay')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  viewStyle === 'overlay' ? 'bg-neutral-700 text-white shadow-2xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Overlay Crossfade</span>
              </button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 border-l border-neutral-800 pl-3">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-neutral-300 w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page selector bar */}
        <div className="px-6 py-2 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between text-xs gap-4">
          {/* Select Page A */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="font-semibold text-blue-400 uppercase tracking-wider text-[11px] shrink-0">Page A:</span>
            <select
              value={pageAId}
              onChange={(e) => setPageAId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500 font-mono"
            >
              {pages.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  #{idx + 1} · {p.sourceFileName} (p.{p.originalPageNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Overlay alpha slider if overlay mode */}
          {viewStyle === 'overlay' && (
            <div className="flex items-center gap-3 px-4 py-1 bg-neutral-800/80 rounded-lg animate-in fade-in">
              <span className="text-[11px] text-blue-400 font-semibold">Page A</span>
              <input
                type="range"
                min="0"
                max="100"
                value={overlayAlpha}
                onChange={(e) => setOverlayAlpha(Number(e.target.value))}
                className="w-32 accent-blue-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
              />
              <span className="text-[11px] text-amber-400 font-semibold">Page B</span>
              <span className="text-[11px] font-mono text-neutral-400">{overlayAlpha}%</span>
            </div>
          )}

          {/* Select Page B */}
          <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
            <span className="font-semibold text-amber-400 uppercase tracking-wider text-[11px] shrink-0">Page B:</span>
            <select
              value={pageBId}
              onChange={(e) => setPageBId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-amber-500 font-mono"
            >
              {pages.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  #{idx + 1} · {p.sourceFileName} (p.{p.originalPageNumber})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-neutral-950 flex items-center justify-center">
          {viewStyle === 'split' ? (
            /* Split View */
            <div className="grid grid-cols-2 gap-8 w-full max-w-5xl h-full items-center">
              {/* Page A Container */}
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-[11px] text-neutral-400 font-mono mb-2 flex items-center gap-2">
                  <span className="text-blue-400 font-semibold">Page A (#{pageAIndex + 1})</span>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{pageA.sourceFileName}</span>
                </div>
                <div
                  className="bg-white rounded shadow-2xl p-1 max-h-[70vh] flex items-center justify-center transition-transform duration-150"
                  style={{ transform: `scale(${zoomLevel}) rotate(${pageA.rotation}deg)` }}
                >
                  {pageA.thumbnailUrl && (
                    <img
                      src={pageA.thumbnailUrl}
                      alt="Page A"
                      className="max-h-[65vh] w-auto object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Page B Container */}
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-[11px] text-neutral-400 font-mono mb-2 flex items-center gap-2">
                  <span className="text-amber-400 font-semibold">Page B (#{pageBIndex + 1})</span>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{pageB.sourceFileName}</span>
                </div>
                <div
                  className="bg-white rounded shadow-2xl p-1 max-h-[70vh] flex items-center justify-center transition-transform duration-150"
                  style={{ transform: `scale(${zoomLevel}) rotate(${pageB.rotation}deg)` }}
                >
                  {pageB.thumbnailUrl && (
                    <img
                      src={pageB.thumbnailUrl}
                      alt="Page B"
                      className="max-h-[65vh] w-auto object-contain"
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Overlay Crossfade Mode */
            <div
              className="relative max-h-[75vh] flex items-center justify-center bg-white rounded shadow-2xl p-2 transition-transform duration-150"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Base Layer: Page A */}
              {pageA.thumbnailUrl && (
                <img
                  src={pageA.thumbnailUrl}
                  alt="Page A base"
                  className="max-h-[70vh] w-auto object-contain"
                  style={{
                    opacity: (100 - overlayAlpha) / 100,
                    transform: `rotate(${pageA.rotation}deg)`,
                  }}
                />
              )}

              {/* Overlay Layer: Page B */}
              {pageB.thumbnailUrl && (
                <img
                  src={pageB.thumbnailUrl}
                  alt="Page B overlay"
                  className="absolute inset-0 m-auto max-h-[70vh] w-auto object-contain pointer-events-none mix-blend-multiply"
                  style={{
                    opacity: overlayAlpha / 100,
                    transform: `rotate(${pageB.rotation}deg)`,
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-4">
            <span>Dimensions A: <span className="font-mono text-neutral-300">{pageA.width} × {pageA.height}</span></span>
            <span>Dimensions B: <span className="font-mono text-neutral-300">{pageB.width} × {pageB.height}</span></span>
          </div>

          <div className="text-neutral-500">
            {viewStyle === 'overlay' ? 'Use the crossfade slider to identify edited text & displaced lines' : 'Side-by-side synchronized document inspection'}
          </div>
        </div>
      </div>
    </div>
  );
};
