import React, { useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { PdfPageItem } from '../types/pdf';

interface PageCardProps {
  page: PdfPageItem;
  index: number;
  totalCount: number;
  isSelected: boolean;
  isDragging: boolean;
  dropIndicator: 'left' | 'right' | null;
  cardSize: number; // width in pixels (e.g. 160 to 280)
  onToggleSelect: (pageId: string, event: React.MouseEvent) => void;
  onRotate: (pageId: string, deltaDegrees: number) => void;
  onDelete: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onPreview: (page: PdfPageItem) => void;
  onMoveQuick: (pageId: string, direction: 'left' | 'right') => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export const PageCard: React.FC<PageCardProps> = ({
  page,
  index,
  totalCount,
  isSelected,
  isDragging,
  dropIndicator,
  cardSize,
  onToggleSelect,
  onRotate,
  onDelete,
  onDuplicate,
  onPreview,
  onMoveQuick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Height proportional to A4 standard aspect ratio (~1.414)
  const cardHeight = Math.round(cardSize * 1.38);

  return (
    <div
      className="relative group select-none flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Drop indicator vertical bar */}
      {dropIndicator === 'left' && (
        <div className="absolute -left-2 top-0 bottom-6 w-1 bg-blue-600 rounded-full z-20 shadow-md animate-pulse pointer-events-none" />
      )}
      {dropIndicator === 'right' && (
        <div className="absolute -right-2 top-0 bottom-6 w-1 bg-blue-600 rounded-full z-20 shadow-md animate-pulse pointer-events-none" />
      )}

      {/* Main card box */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onClick={(e) => onToggleSelect(page.id, e)}
        style={{ width: `${cardSize}px`, height: `${cardHeight}px` }}
        className={`relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-150 bg-white border ${
          isSelected
            ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-md'
            : 'border-neutral-200 hover:border-neutral-400 shadow-xs hover:shadow-md'
        } ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'}`}
      >
        {/* Source File indicator top strip */}
        <div
          className="absolute top-0 left-0 right-0 h-1 z-10"
          style={{ backgroundColor: page.fileColor }}
        />

        {/* Top Badges: Sequence Number & Checkbox */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-1 bg-neutral-900/80 backdrop-blur-xs text-white text-[11px] font-mono font-medium px-2 py-0.5 rounded shadow-xs">
            <GripVertical className="w-2.5 h-2.5 opacity-60" />
            <span className="tabular-nums">#{index + 1}</span>
          </div>

          <div className="pointer-events-auto">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}} // handled by card onClick
              aria-label={`Select page ${index + 1}`}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        {/* Thumbnail Preview Area with rotation */}
        <div className="w-full h-full p-3 pt-7 pb-4 flex items-center justify-center bg-neutral-50/50 overflow-hidden">
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
            style={{
              transform: `rotate(${page.rotation}deg)`,
            }}
          >
            {page.thumbnailUrl ? (
              <img
                src={page.thumbnailUrl}
                alt={`${page.sourceFileName} page ${page.originalPageNumber}`}
                className="max-w-full max-h-full object-contain rounded shadow-xs border border-neutral-100 bg-white"
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs font-mono">
                Loading...
              </div>
            )}
          </div>
        </div>

        {/* Rotation Badge if rotated */}
        {page.rotation !== 0 && (
          <div className="absolute bottom-2 right-2 bg-neutral-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none z-10">
            {page.rotation}°
          </div>
        )}

        {/* Hover / Active Action Overlay Toolbar */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-900/90 via-neutral-900/70 to-transparent p-2 pt-6 flex items-center justify-between text-white transition-opacity duration-150 z-20 ${
            isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rotate actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRotate(page.id, -90)}
              title="Rotate counter-clockwise 90°"
              className="p-1.5 rounded hover:bg-white/20 text-neutral-200 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onRotate(page.id, 90)}
              title="Rotate clockwise 90°"
              className="p-1.5 rounded hover:bg-white/20 text-neutral-200 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick inspect and duplicates */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPreview(page)}
              title="Inspect full screen"
              className="p-1.5 rounded hover:bg-white/20 text-neutral-200 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDuplicate(page.id)}
              title="Duplicate this page"
              className="p-1.5 rounded hover:bg-white/20 text-neutral-200 hover:text-white transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(page.id)}
              title="Delete this page"
              className="p-1.5 rounded hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer metadata & Quick Move controls below the card */}
      <div
        style={{ width: `${cardSize}px` }}
        className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500 px-0.5"
      >
        <div className="flex items-center gap-1 truncate max-w-[calc(100%-40px)]" title={`${page.sourceFileName} · Page ${page.originalPageNumber}`}>
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: page.fileColor }}
          />
          <span className="truncate">{page.sourceFileName}</span>
          <span className="text-neutral-400 shrink-0 font-mono">p.{page.originalPageNumber}</span>
        </div>

        {/* Quick move buttons */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveQuick(page.id, 'left');
            }}
            disabled={index === 0}
            title="Move left"
            className="p-0.5 hover:bg-neutral-200 rounded disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3 h-3 text-neutral-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveQuick(page.id, 'right');
            }}
            disabled={index === totalCount - 1}
            title="Move right"
            className="p-0.5 hover:bg-neutral-200 rounded disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3 h-3 text-neutral-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
