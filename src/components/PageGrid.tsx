import React, { useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  ArrowUpDown,
  CheckSquare,
  Square,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Layers,
  LayoutGrid,
  ChevronsLeft,
  ChevronsRight,
  Shuffle,
  Search,
} from 'lucide-react';
import { PdfPageItem, ViewMode } from '../types/pdf';
import { PageCard } from './PageCard';

interface PageGridProps {
  pages: PdfPageItem[];
  selectedIds: Set<string>;
  viewMode: ViewMode;
  cardSize: number;
  canUndo: boolean;
  canRedo: boolean;
  onCardSizeChange: (size: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleSelect: (pageId: string, event: React.MouseEvent) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onSelectRange: (rangeString: string) => void;
  onRotatePages: (pageIds: string[], deltaDegrees: number) => void;
  onDeletePages: (pageIds: string[]) => void;
  onDuplicatePages: (pageIds: string[]) => void;
  onReversePages: (pageIds?: string[]) => void;
  onReorderPages: (fromIndices: number[], toIndex: number) => void;
  onMoveSelectedToEdge: (edge: 'start' | 'end') => void;
  onInterleavePages: () => void;
  onMoveQuick: (pageId: string, direction: 'left' | 'right') => void;
  onPreviewPage: (page: PdfPageItem) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const PageGrid: React.FC<PageGridProps> = ({
  pages,
  selectedIds,
  viewMode,
  cardSize,
  canUndo,
  canRedo,
  onCardSizeChange,
  onViewModeChange,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onSelectRange,
  onRotatePages,
  onDeletePages,
  onDuplicatePages,
  onReversePages,
  onReorderPages,
  onMoveSelectedToEdge,
  onInterleavePages,
  onMoveQuick,
  onPreviewPage,
  onUndo,
  onRedo,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ index: number; position: 'left' | 'right' } | null>(null);
  const [rangeInput, setRangeInput] = useState('');
  const [showRangeBox, setShowRangeBox] = useState(false);

  // Group pages by source document if in grouped view
  const groupedPages = React.useMemo(() => {
    const groups: { [key: string]: { fileName: string; color: string; items: { page: PdfPageItem; globalIndex: number }[] } } = {};
    pages.forEach((page, index) => {
      if (!groups[page.sourceFileId]) {
        groups[page.sourceFileId] = {
          fileName: page.sourceFileName,
          color: page.fileColor,
          items: [],
        };
      }
      groups[page.sourceFileId].items.push({ page, globalIndex: index });
    });
    return Object.values(groups);
  }, [pages]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDropIndicator(null);
      return;
    }

    const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX;
    const isRightHalf = mouseX > targetRect.left + targetRect.width / 2;

    setDropIndicator({
      index: targetIndex,
      position: isRightHalf ? 'right' : 'left',
    });
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null) {
      setDropIndicator(null);
      return;
    }

    const draggedPage = pages[draggedIndex];
    let indicesToMove: number[] = [];

    // If dragged item is part of a multi-selection, move all selected items
    if (selectedIds.has(draggedPage.id)) {
      indicesToMove = pages
        .map((p, idx) => (selectedIds.has(p.id) ? idx : -1))
        .filter((idx) => idx !== -1);
    } else {
      indicesToMove = [draggedIndex];
    }

    // Determine target index based on indicator position
    const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isRightHalf = e.clientX > targetRect.left + targetRect.width / 2;
    let finalTarget = isRightHalf ? targetIndex + 1 : targetIndex;

    onReorderPages(indicesToMove, finalTarget);

    setDraggedIndex(null);
    setDropIndicator(null);
  };

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (rangeInput.trim()) {
      onSelectRange(rangeInput.trim());
      setShowRangeBox(false);
    }
  };

  const hasSelection = selectedIds.size > 0;
  const allSelected = pages.length > 0 && selectedIds.size === pages.length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-100/60 pb-12">
      {/* Control bar: Selection toolbar & Layout View toggles */}
      <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Left: Selection and Batch Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Select all / none checkbox */}
          <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-neutral-200">
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
              title={allSelected ? 'Deselect all pages' : 'Select all pages'}
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span>{allSelected ? 'Deselect' : 'Select All'}</span>
            </button>

            {/* Quick Range Selector Popover */}
            <div className="relative">
              <button
                onClick={() => setShowRangeBox(!showRangeBox)}
                className="px-2 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Select pages by range (e.g. 1-3, 5)"
              >
                Range...
              </button>

              {showRangeBox && (
                <form
                  onSubmit={handleApplyRange}
                  className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-neutral-200 rounded-lg shadow-xl p-3 z-30 animate-in fade-in zoom-in-95 duration-100"
                >
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Select Page Range
                  </label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="e.g. 1-3, 5, 7-10"
                    autoFocus
                    className="w-full text-xs font-mono px-2.5 py-1.5 border border-neutral-300 rounded mb-2 outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowRangeBox(false)}
                      className="text-[11px] text-neutral-500 hover:text-neutral-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
                    >
                      Apply Range
                    </button>
                  </div>
                </form>
              )}
            </div>

            {hasSelection && (
              <span className="text-xs font-mono tabular-nums text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                {selectedIds.size} of {pages.length}
              </span>
            )}
          </div>

          {/* Bulk operation buttons */}
          {hasSelection ? (
            <div className="flex items-center gap-1 animate-in fade-in duration-100">
              <button
                onClick={() => onRotatePages(Array.from(selectedIds), -90)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Rotate selected pages 90° counter-clockwise"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">-90°</span>
              </button>

              <button
                onClick={() => onRotatePages(Array.from(selectedIds), 90)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Rotate selected pages 90° clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+90°</span>
              </button>

              <button
                onClick={() => onDuplicatePages(Array.from(selectedIds))}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Duplicate selected pages"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>

              {/* Move selected to start / end */}
              <button
                onClick={() => onMoveSelectedToEdge('start')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Move selected pages to the very beginning"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">To Start</span>
              </button>

              <button
                onClick={() => onMoveSelectedToEdge('end')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Move selected pages to the very end"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
                <span className="hidden md:inline">To End</span>
              </button>

              <button
                onClick={() => onReversePages(Array.from(selectedIds))}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Reverse sequence of selected pages"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reverse</span>
              </button>

              <button
                onClick={() => onDeletePages(Array.from(selectedIds))}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                title="Delete selected pages"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <button
                onClick={() => onRotatePages(pages.map((p) => p.id), 90)}
                className="inline-flex items-center gap-1 px-2 py-1 text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Rotate all pages 90° clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate All</span>
              </button>

              <button
                onClick={() => onReversePages()}
                className="inline-flex items-center gap-1 px-2 py-1 text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Reverse order of all pages"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Reverse All</span>
              </button>

              <button
                onClick={onInterleavePages}
                className="inline-flex items-center gap-1 px-2 py-1 text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                title="Interleave / Collate pages from different documents (alternating front & back)"
              >
                <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                <span>Collate / Interleave</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: History controls, View Mode switcher & Zoom slider */}
        <div className="flex items-center gap-3">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border-r border-neutral-200 pr-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
              title="Undo last change (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
              title="Redo change (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Mode Segmented Switcher */}
          <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('grouped')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Grouped by Document"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Size Slider (Only relevant in grid/grouped view) */}
          <div className="hidden lg:flex items-center gap-1.5 text-neutral-400 pl-2 border-l border-neutral-200">
            <ZoomOut className="w-3.5 h-3.5" />
            <input
              type="range"
              min="140"
              max="280"
              step="10"
              value={cardSize}
              onChange={(e) => onCardSizeChange(Number(e.target.value))}
              aria-label="Thumbnail card size"
              className="w-20 accent-neutral-800 cursor-pointer h-1 bg-neutral-200 rounded-lg"
            />
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Pages Canvas Area */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {viewMode === 'grouped' ? (
          <div className="flex flex-col gap-8">
            {groupedPages.map((group, gIdx) => (
              <div key={gIdx} className="bg-white/80 border border-neutral-200/90 rounded-xl p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <h3 className="text-sm font-semibold text-neutral-900 truncate">
                      {group.fileName}
                    </h3>
                    <span className="text-xs text-neutral-400 font-mono">
                      ({group.items.length} {group.items.length === 1 ? 'page' : 'pages'})
                    </span>
                  </div>
                </div>

                <div
                  className="grid gap-4 sm:gap-6 justify-center sm:justify-start"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
                  }}
                >
                  {group.items.map(({ page, globalIndex }) => (
                    <PageCard
                      key={page.id}
                      page={page}
                      index={globalIndex}
                      totalCount={pages.length}
                      isSelected={selectedIds.has(page.id)}
                      isDragging={draggedIndex === globalIndex}
                      dropIndicator={
                        dropIndicator && dropIndicator.index === globalIndex
                          ? dropIndicator.position
                          : null
                      }
                      cardSize={cardSize}
                      onToggleSelect={onToggleSelect}
                      onRotate={(id, delta) => onRotatePages([id], delta)}
                      onDelete={(id) => onDeletePages([id])}
                      onDuplicate={(id) => onDuplicatePages([id])}
                      onPreview={onPreviewPage}
                      onMoveQuick={onMoveQuick}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Standard Fluid Continuous Grid View */
          <div
            className="grid gap-4 sm:gap-6 justify-center sm:justify-start"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
            }}
          >
            {pages.map((page, index) => (
              <PageCard
                key={page.id}
                page={page}
                index={index}
                totalCount={pages.length}
                isSelected={selectedIds.has(page.id)}
                isDragging={draggedIndex === index}
                dropIndicator={
                  dropIndicator && dropIndicator.index === index
                    ? dropIndicator.position
                    : null
                }
                cardSize={cardSize}
                onToggleSelect={onToggleSelect}
                onRotate={(id, delta) => onRotatePages([id], delta)}
                onDelete={(id) => onDeletePages([id])}
                onDuplicate={(id) => onDuplicatePages([id])}
                onPreview={onPreviewPage}
                onMoveQuick={onMoveQuick}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
