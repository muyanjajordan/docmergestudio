/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { SourceFilesBar } from './components/SourceFilesBar';
import { PageGrid } from './components/PageGrid';
import { EmptyState } from './components/EmptyState';
import { DropOverlay } from './components/DropOverlay';
import { PagePreviewModal } from './components/PagePreviewModal';
import { ExportModal } from './components/ExportModal';
import { SplitModal } from './components/SplitModal';
import { InsertPageModal } from './components/InsertPageModal';
import { CompareModal } from './components/CompareModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { UploadedPdfFile, PdfPageItem, ViewMode, ExportSettings } from './types/pdf';
import {
  FILE_COLORS,
  createSamplePdfs,
  extractPagesFromPdf,
} from './utils/pdfHelper';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<UploadedPdfFile[]>([]);
  const [fileBuffers, setFileBuffers] = useState<Map<string, ArrayBuffer>>(new Map());
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [cardSize, setCardSize] = useState<number>(190);

  // Undo / Redo history
  const [history, setHistory] = useState<PdfPageItem[][]>([]);
  const [redoStack, setRedoStack] = useState<PdfPageItem[][]>([]);

  // Modals & previews
  const [previewPage, setPreviewPage] = useState<PdfPageItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Global Export Settings
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    fileName: 'merged_document.pdf',
    pageSize: 'original',
    pageNumbers: {
      enabled: false,
      position: 'bottom-center',
      format: 'page_x_of_y',
      startFrom: 1,
      skipFirstPage: false,
    },
    watermark: {
      enabled: false,
      text: 'CONFIDENTIAL',
      color: '#DC2626',
      opacity: 0.25,
      fontSize: 48,
      rotation: 45,
      applyTo: 'all',
    },
    metadata: {
      title: '',
      author: '',
      subject: '',
      keywords: '',
    },
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string, action?: { label: string; onClick: () => void }) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Save history state before mutation
  const pushHistory = useCallback((currentPages: PdfPageItem[]) => {
    setHistory((prev) => [...prev.slice(-25), currentPages]);
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, pages]);
    setPages(previous);
    addToast('info', 'Undo successful');
  }, [history, pages, addToast]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, pages]);
    setPages(next);
    addToast('info', 'Redo successful');
  }, [redoStack, pages, addToast]);

  // Handle file uploads
  const handleUploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const validFiles = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      addToast('error', 'Please upload valid PDF documents');
      return;
    }

    setIsProcessing(true);
    pushHistory(pages);

    const newFiles: UploadedPdfFile[] = [];
    const newPages: PdfPageItem[] = [];
    const newBuffers = new Map(fileBuffers);

    for (let fIdx = 0; fIdx < validFiles.length; fIdx++) {
      const file = validFiles[fIdx];
      const fileId = `file-${Date.now()}-${fIdx}-${Math.random().toString(36).slice(2, 6)}`;
      const fileColor = FILE_COLORS[(files.length + fIdx) % FILE_COLORS.length];

      setProcessingStatus(`Processing ${file.name} (${fIdx + 1}/${validFiles.length})...`);

      try {
        const buffer = await file.arrayBuffer();
        newBuffers.set(fileId, buffer);

        const extractedPages = await extractPagesFromPdf(
          fileId,
          file.name,
          buffer,
          fileColor,
          (curr, tot) => {
            setProcessingStatus(`Rendering ${file.name}: page ${curr} of ${tot}...`);
          }
        );

        newFiles.push({
          id: fileId,
          name: file.name,
          size: file.size,
          arrayBuffer: buffer,
          pageCount: extractedPages.length,
          color: fileColor,
        });

        newPages.push(...extractedPages);
      } catch (err) {
        console.error(`Failed reading ${file.name}`, err);
        addToast('error', `Could not read ${file.name}`);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setFileBuffers(newBuffers);
    setPages((prev) => [...prev, ...newPages]);
    setIsProcessing(false);
    setProcessingStatus('');

    addToast('success', `Added ${newPages.length} pages from ${newFiles.length} document(s)`);
  }, [files.length, fileBuffers, pages, pushHistory, addToast]);

  // Load sample PDFs
  const handleLoadSamples = useCallback(async () => {
    setIsProcessing(true);
    setProcessingStatus('Generating sample PDF documents in memory...');
    pushHistory(pages);

    try {
      const samplePdfs = await createSamplePdfs();
      const newFiles: UploadedPdfFile[] = [];
      const newPages: PdfPageItem[] = [];
      const newBuffers = new Map(fileBuffers);

      for (let i = 0; i < samplePdfs.length; i++) {
        const sample = samplePdfs[i];
        const fileId = `sample-${Date.now()}-${i}`;
        newBuffers.set(fileId, sample.buffer);

        setProcessingStatus(`Extracting pages from ${sample.name}...`);
        const extractedPages = await extractPagesFromPdf(
          fileId,
          sample.name,
          sample.buffer,
          sample.color
        );

        newFiles.push({
          id: fileId,
          name: sample.name,
          size: sample.buffer.byteLength,
          arrayBuffer: sample.buffer,
          pageCount: extractedPages.length,
          color: sample.color,
        });

        newPages.push(...extractedPages);
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setFileBuffers(newBuffers);
      setPages((prev) => [...prev, ...newPages]);
      addToast('success', `Loaded 3 sample PDFs with ${newPages.length} total pages`);
    } catch (err) {
      console.error('Failed loading sample PDFs', err);
      addToast('error', 'Could not load sample documents');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [fileBuffers, pages, pushHistory, addToast]);

  // Insert a newly generated blank page or image page
  const handleInsertPage = useCallback((
    buffer: ArrayBuffer,
    sourceFileName: string,
    width: number,
    height: number,
    thumbnailUrl: string,
    targetIndex: number
  ) => {
    pushHistory(pages);
    const fileId = `inserted-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fileColor = '#64748B'; // Slate gray for inserted sheets

    const newBuffers = new Map(fileBuffers);
    newBuffers.set(fileId, buffer);
    setFileBuffers(newBuffers);

    const newFile: UploadedPdfFile = {
      id: fileId,
      name: sourceFileName,
      size: buffer.byteLength,
      arrayBuffer: buffer,
      pageCount: 1,
      color: fileColor,
    };
    setFiles((prev) => [...prev, newFile]);

    const newPageItem: PdfPageItem = {
      id: `${fileId}-p0-${Date.now()}`,
      sourceFileId: fileId,
      sourceFileName,
      sourcePageIndex: 0,
      originalPageNumber: 1,
      rotation: 0,
      thumbnailUrl,
      aspectRatio: width / height,
      fileColor,
      width,
      height,
    };

    const nextPages = [...pages];
    nextPages.splice(targetIndex, 0, newPageItem);
    setPages(nextPages);

    addToast('success', `Inserted page at position #${targetIndex + 1}`);
  }, [pages, fileBuffers, pushHistory, addToast]);

  // Reorder pages via drag and drop
  const handleReorderPages = useCallback((fromIndices: number[], toIndex: number) => {
    if (fromIndices.length === 0) return;

    pushHistory(pages);

    const sortedIndices = [...fromIndices].sort((a, b) => a - b);
    const itemsToMove = sortedIndices.map((i) => pages[i]);
    const itemsToMoveSet = new Set(itemsToMove.map((item) => item.id));

    const remaining = pages.filter((item) => !itemsToMoveSet.has(item.id));

    const itemsBeforeTarget = sortedIndices.filter((i) => i < toIndex).length;
    let effectiveTarget = toIndex - itemsBeforeTarget;
    effectiveTarget = Math.max(0, Math.min(remaining.length, effectiveTarget));

    const newPages = [
      ...remaining.slice(0, effectiveTarget),
      ...itemsToMove,
      ...remaining.slice(effectiveTarget),
    ];

    setPages(newPages);
  }, [pages, pushHistory]);

  // Move selected pages to start or end of document
  const handleMoveSelectedToEdge = useCallback((edge: 'start' | 'end') => {
    if (selectedIds.size === 0) return;
    pushHistory(pages);

    const selectedPages = pages.filter((p) => selectedIds.has(p.id));
    const nonSelectedPages = pages.filter((p) => !selectedIds.has(p.id));

    const newPages = edge === 'start'
      ? [...selectedPages, ...nonSelectedPages]
      : [...nonSelectedPages, ...selectedPages];

    setPages(newPages);
    addToast('info', `Moved ${selectedPages.length} pages to ${edge === 'start' ? 'beginning' : 'end'}`);
  }, [pages, selectedIds, pushHistory, addToast]);

  // Collate / Interleave pages from source documents
  const handleInterleavePages = useCallback(() => {
    if (files.length < 2) {
      addToast('info', 'Requires at least 2 source documents to interleave pages');
      return;
    }

    pushHistory(pages);

    // Group pages by source document
    const docPagesMap = new Map<string, PdfPageItem[]>();
    files.forEach((f) => docPagesMap.set(f.id, []));
    pages.forEach((p) => {
      if (docPagesMap.has(p.sourceFileId)) {
        docPagesMap.get(p.sourceFileId)!.push(p);
      }
    });

    const docLists = Array.from(docPagesMap.values());
    const maxLen = Math.max(...docLists.map((l) => l.length));
    const interleaved: PdfPageItem[] = [];

    for (let i = 0; i < maxLen; i++) {
      for (const list of docLists) {
        if (i < list.length) {
          interleaved.push(list[i]);
        }
      }
    }

    setPages(interleaved);
    addToast('success', 'Interleaved pages across source documents');
  }, [files, pages, pushHistory, addToast]);

  // Select pages via range string (e.g. "1-3, 5, 8")
  const handleSelectRange = useCallback((rangeStr: string) => {
    const indices: Set<number> = new Set();
    const parts = rangeStr.split(/[,;\s]+/);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(pages.length, Math.max(start, end));
          for (let i = from; i <= to; i++) {
            indices.add(i - 1);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= pages.length) {
          indices.add(num - 1);
        }
      }
    }

    const matchedIds = new Set<string>();
    indices.forEach((idx) => {
      if (pages[idx]) {
        matchedIds.add(pages[idx].id);
      }
    });

    setSelectedIds(matchedIds);
    addToast('info', `Selected ${matchedIds.size} page(s) in range`);
  }, [pages, addToast]);

  // Quick move left / right
  const handleMoveQuick = useCallback((pageId: string, direction: 'left' | 'right') => {
    const currentIndex = pages.findIndex((p) => p.id === pageId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    pushHistory(pages);
    const newPages = [...pages];
    const [moved] = newPages.splice(currentIndex, 1);
    newPages.splice(targetIndex, 0, moved);
    setPages(newPages);
  }, [pages, pushHistory]);

  // Rotate pages
  const handleRotatePages = useCallback((pageIds: string[], deltaDegrees: number) => {
    pushHistory(pages);
    const idSet = new Set(pageIds);
    setPages((prev) =>
      prev.map((p) => {
        if (idSet.has(p.id)) {
          const newRot = (p.rotation + deltaDegrees + 360) % 360;
          return { ...p, rotation: newRot };
        }
        return p;
      })
    );

    if (previewPage && idSet.has(previewPage.id)) {
      setPreviewPage((prev) => prev ? { ...prev, rotation: (prev.rotation + deltaDegrees + 360) % 360 } : null);
    }
  }, [pages, pushHistory, previewPage]);

  // Delete pages
  const handleDeletePages = useCallback((pageIds: string[]) => {
    pushHistory(pages);
    const idSet = new Set(pageIds);
    const deletedCount = idSet.size;
    const previousPages = pages;

    setPages((prev) => prev.filter((p) => !idSet.has(p.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => next.delete(id));
      return next;
    });

    addToast('info', `Deleted ${deletedCount} page(s)`, {
      label: 'Undo',
      onClick: () => {
        setPages(previousPages);
        setHistory((prev) => prev.slice(0, -1));
      },
    });
  }, [pages, pushHistory, addToast]);

  // Duplicate pages
  const handleDuplicatePages = useCallback((pageIds: string[]) => {
    pushHistory(pages);
    const idSet = new Set(pageIds);
    const newPages: PdfPageItem[] = [];

    pages.forEach((page) => {
      newPages.push(page);
      if (idSet.has(page.id)) {
        newPages.push({
          ...page,
          id: `${page.sourceFileId}-clone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        });
      }
    });

    setPages(newPages);
    addToast('success', `Duplicated ${idSet.size} page(s)`);
  }, [pages, pushHistory, addToast]);

  // Reverse pages
  const handleReversePages = useCallback((pageIds?: string[]) => {
    pushHistory(pages);
    if (!pageIds || pageIds.length === 0) {
      setPages((prev) => [...prev].reverse());
      addToast('info', 'Reversed all pages');
    } else {
      const idSet = new Set(pageIds);
      const selectedPages = pages.filter((p) => idSet.has(p.id)).reverse();
      let sIdx = 0;
      setPages((prev) =>
        prev.map((p) => (idSet.has(p.id) ? selectedPages[sIdx++] : p))
      );
      addToast('info', `Reversed ${pageIds.length} selected pages`);
    }
  }, [pages, pushHistory, addToast]);

  // Remove source file
  const handleRemoveFile = useCallback((fileId: string) => {
    pushHistory(pages);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setFileBuffers((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
    setPages((prev) => prev.filter((p) => p.sourceFileId !== fileId));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      pages.forEach((p) => {
        if (p.sourceFileId !== fileId && prev.has(p.id)) {
          next.add(p.id);
        }
      });
      return next;
    });
    addToast('info', 'Document and its pages removed');
  }, [pages, pushHistory, addToast]);

  // Move entire document order up or down
  const handleMoveFileOrder = useCallback((fileId: string, direction: 'up' | 'down') => {
    const fileIndex = files.findIndex((f) => f.id === fileId);
    if (fileIndex === -1) return;

    const targetFileIndex = direction === 'up' ? fileIndex - 1 : fileIndex + 1;
    if (targetFileIndex < 0 || targetFileIndex >= files.length) return;

    pushHistory(pages);

    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fileIndex, 1);
    newFiles.splice(targetFileIndex, 0, movedFile);
    setFiles(newFiles);

    const newPagesOrder: PdfPageItem[] = [];
    newFiles.forEach((file) => {
      const filePages = pages.filter((p) => p.sourceFileId === file.id);
      newPagesOrder.push(...filePages);
    });
    setPages(newPagesOrder);
  }, [files, pages, pushHistory]);

  // Select pages belonging to a specific file
  const handleSelectPagesOfFile = useCallback((fileId: string) => {
    const filePages = pages.filter((p) => p.sourceFileId === fileId);
    setSelectedIds(new Set(filePages.map((p) => p.id)));
  }, [pages]);

  // Toggle selection
  const handleToggleSelect = useCallback((pageId: string, event: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (event.shiftKey && pages.length > 0) {
        next.add(pageId);
      } else {
        if (next.has(pageId)) {
          next.delete(pageId);
        } else {
          next.add(pageId);
        }
      }
      return next;
    });
  }, [pages]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(pages.map((p) => p.id)));
  }, [pages]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleInvertSelection = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      pages.forEach((p) => {
        if (!prev.has(p.id)) {
          next.add(p.id);
        }
      });
      return next;
    });
  }, [pages]);

  const handleClearAll = useCallback(() => {
    if (pages.length === 0) return;
    if (window.confirm('Are you sure you want to clear all documents and pages?')) {
      pushHistory(pages);
      setFiles([]);
      setFileBuffers(new Map());
      setPages([]);
      setSelectedIds(new Set());
      addToast('info', 'Workspace cleared');
    }
  }, [pages, pushHistory, addToast]);

  // Modal navigation
  const currentPreviewIndex = useMemo(() => {
    if (!previewPage) return -1;
    return pages.findIndex((p) => p.id === previewPage.id);
  }, [previewPage, pages]);

  const handleNavigatePreview = useCallback((direction: 'prev' | 'next') => {
    if (currentPreviewIndex === -1) return;
    const targetIdx = direction === 'prev' ? currentPreviewIndex - 1 : currentPreviewIndex + 1;
    if (targetIdx >= 0 && targetIdx < pages.length) {
      setPreviewPage(pages[targetIdx]);
    }
  }, [currentPreviewIndex, pages]);

  // Selected page index for page insertion reference
  const firstSelectedPageIndex = useMemo(() => {
    if (selectedIds.size === 0) return -1;
    const firstId = Array.from(selectedIds)[0];
    return pages.findIndex((p) => p.id === firstId);
  }, [selectedIds, pages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0 && !previewPage && !isExportModalOpen && !isSplitModalOpen && !isInsertModalOpen && !isCompareModalOpen) {
          e.preventDefault();
          handleDeletePages(Array.from(selectedIds));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSelectAll, handleDeletePages, selectedIds, previewPage, isExportModalOpen, isSplitModalOpen, isInsertModalOpen, isCompareModalOpen]);

  // Total estimated size in bytes
  const totalSizeBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + f.size, 0);
  }, [files]);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100/40 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Full-screen Drag and Drop Overlay for dropping files anywhere */}
      <DropOverlay onDropFiles={handleUploadFiles} />

      {/* Top Header */}
      <Header
        totalFiles={files.length}
        totalPages={pages.length}
        totalSizeBytes={totalSizeBytes}
        isProcessing={isProcessing}
        onLoadSamples={handleLoadSamples}
        onClearAll={handleClearAll}
        onOpenSplit={() => setIsSplitModalOpen(true)}
        onOpenInsertPage={() => setIsInsertModalOpen(true)}
        onOpenCompare={() => setIsCompareModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Source Documents Bar */}
      {files.length > 0 && (
        <SourceFilesBar
          files={files}
          onUploadFiles={handleUploadFiles}
          onRemoveFile={handleRemoveFile}
          onMoveFileOrder={handleMoveFileOrder}
          onSelectPagesOfFile={handleSelectPagesOfFile}
          isProcessing={isProcessing}
        />
      )}

      {/* Main Body: Either Empty State or Drag-and-Drop Page Grid */}
      <main className="flex-1 flex flex-col">
        {pages.length === 0 ? (
          <EmptyState
            onUploadFiles={handleUploadFiles}
            onLoadSamples={handleLoadSamples}
            isProcessing={isProcessing}
          />
        ) : (
          <PageGrid
            pages={pages}
            selectedIds={selectedIds}
            viewMode={viewMode}
            cardSize={cardSize}
            canUndo={history.length > 0}
            canRedo={redoStack.length > 0}
            onCardSizeChange={setCardSize}
            onViewModeChange={setViewMode}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onInvertSelection={handleInvertSelection}
            onSelectRange={handleSelectRange}
            onRotatePages={handleRotatePages}
            onDeletePages={handleDeletePages}
            onDuplicatePages={handleDuplicatePages}
            onReversePages={handleReversePages}
            onReorderPages={handleReorderPages}
            onMoveSelectedToEdge={handleMoveSelectedToEdge}
            onInterleavePages={handleInterleavePages}
            onMoveQuick={handleMoveQuick}
            onPreviewPage={setPreviewPage}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )}
      </main>

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex items-center gap-4 border border-neutral-200 max-w-md w-full animate-in zoom-in-95 duration-150">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-neutral-900">Processing Documents</h4>
              <p className="text-xs text-neutral-500 truncate mt-0.5">{processingStatus || 'Please wait...'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Page Preview Modal */}
      {previewPage && (
        <PagePreviewModal
          page={previewPage}
          currentIndex={currentPreviewIndex}
          totalCount={pages.length}
          onClose={() => setPreviewPage(null)}
          onNavigate={handleNavigatePreview}
          onRotate={(id, delta) => handleRotatePages([id], delta)}
          onDelete={(id) => handleDeletePages([id])}
        />
      )}

      {/* Split & Extract Modal */}
      {isSplitModalOpen && (
        <SplitModal
          isOpen={isSplitModalOpen}
          pages={pages}
          fileBuffers={fileBuffers}
          selectedIds={selectedIds}
          exportSettings={exportSettings}
          onClose={() => setIsSplitModalOpen(false)}
          onSuccess={(msg) => addToast('success', msg)}
        />
      )}

      {/* Insert Page Modal */}
      {isInsertModalOpen && (
        <InsertPageModal
          isOpen={isInsertModalOpen}
          pagesCount={pages.length}
          selectedPageIndex={firstSelectedPageIndex}
          onClose={() => setIsInsertModalOpen(false)}
          onInsertPage={handleInsertPage}
        />
      )}

      {/* Side-by-Side Compare Modal */}
      {isCompareModalOpen && (
        <CompareModal
          isOpen={isCompareModalOpen}
          pages={pages}
          initialPageA={pages[0]}
          initialPageB={pages[1] || pages[0]}
          onClose={() => setIsCompareModalOpen(false)}
        />
      )}

      {/* Export Merged PDF Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          pages={pages}
          fileBuffers={fileBuffers}
          selectedIds={selectedIds}
          estimatedSizeBytes={totalSizeBytes}
          initialSettings={exportSettings}
          onClose={() => setIsExportModalOpen(false)}
          onSuccess={(name) => addToast('success', `Merged PDF saved as "${name}"`)}
        />
      )}

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
