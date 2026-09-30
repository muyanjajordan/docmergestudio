import React, { useState, useRef } from 'react';
import {
  X,
  PlusCircle,
  FilePlus2,
  Image as ImageIcon,
  Loader2,
  Upload,
} from 'lucide-react';
import { PdfPageItem } from '../types/pdf';
import { createBlankPagePdf, createImagePagePdf } from '../utils/pdfHelper';

interface InsertPageModalProps {
  isOpen: boolean;
  pagesCount: number;
  selectedPageIndex: number; // -1 if none
  onClose: () => void;
  onInsertPage: (
    buffer: ArrayBuffer,
    sourceFileName: string,
    width: number,
    height: number,
    thumbnailUrl: string,
    targetIndex: number
  ) => void;
}

export const InsertPageModal: React.FC<InsertPageModalProps> = ({
  isOpen,
  pagesCount,
  selectedPageIndex,
  onClose,
  onInsertPage,
}) => {
  const [insertType, setInsertType] = useState<'blank' | 'image'>('blank');
  const [paperSize, setPaperSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [position, setPosition] = useState<'start' | 'after_selected' | 'end'>(
    selectedPageIndex >= 0 ? 'after_selected' : 'end'
  );

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fitToA4, setFitToA4] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleConfirmInsert = async () => {
    try {
      setIsProcessing(true);
      let targetIndex = pagesCount; // default end
      if (position === 'start') {
        targetIndex = 0;
      } else if (position === 'after_selected' && selectedPageIndex >= 0) {
        targetIndex = selectedPageIndex + 1;
      }

      if (insertType === 'blank') {
        const result = await createBlankPagePdf(paperSize, orientation);
        onInsertPage(
          result.buffer,
          `Blank_${paperSize.toUpperCase()}_Page.pdf`,
          result.width,
          result.height,
          result.thumbnailUrl,
          targetIndex
        );
      } else if (insertType === 'image' && imageFile) {
        const result = await createImagePagePdf(imageFile, fitToA4);
        onInsertPage(
          result.buffer,
          imageFile.name,
          result.width,
          result.height,
          result.thumbnailUrl,
          targetIndex
        );
      }

      onClose();
    } catch (err) {
      console.error('Failed to insert page', err);
      alert('Could not insert page');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Insert Page into Workspace</h2>
              <p className="text-xs text-neutral-500">Add a blank sheet or import an image as a page</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher: Blank vs Image */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setInsertType('blank')}
              className={`py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                insertType === 'blank'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Blank Page</span>
            </button>
            <button
              onClick={() => setInsertType('image')}
              className={`py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                insertType === 'image'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image as Page</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {insertType === 'blank' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1.5">
                  Paper Dimensions
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaperSize('a4')}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      paperSize === 'a4'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500/20'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">A4 Standard</div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">210 × 297 mm (ISO)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('letter')}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      paperSize === 'letter'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500/20'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">US Letter</div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">8.5 × 11.0 in (ANSI)</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1.5">
                  Page Orientation
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-colors cursor-pointer ${
                      orientation === 'portrait'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    Portrait (Vertical)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-colors cursor-pointer ${
                      orientation === 'landscape'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    Landscape (Horizontal)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
              />

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-neutral-100/60 rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <span className="text-xs font-semibold text-neutral-800">Select Image (PNG, JPG, WebP)</span>
                  <span className="text-[11px] text-neutral-400 mt-1">Converts photo, receipt, or graphic to a high-res PDF sheet</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-16 h-20 object-cover rounded border border-neutral-200 bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{imageFile?.name}</p>
                    <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                      {((imageFile?.size || 0) / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-blue-600 hover:underline mt-1 font-medium cursor-pointer"
                    >
                      Choose different image
                    </button>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                <input
                  type="checkbox"
                  checked={fitToA4}
                  onChange={(e) => setFitToA4(e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                />
                <span>Fit and center on standard A4 page with margins</span>
              </label>
            </div>
          )}

          {/* Insertion Target Position */}
          <div className="pt-2 border-t border-neutral-100">
            <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block mb-1.5">
              Placement in Sequence
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPosition('start')}
                className={`p-2 text-xs rounded-lg border text-center transition-colors cursor-pointer ${
                  position === 'start'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                Beginning (#1)
              </button>

              <button
                type="button"
                disabled={selectedPageIndex < 0}
                onClick={() => setPosition('after_selected')}
                className={`p-2 text-xs rounded-lg border text-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  position === 'after_selected'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
                title={selectedPageIndex >= 0 ? `Insert after page #${selectedPageIndex + 1}` : 'Select a page first'}
              >
                After Selected {selectedPageIndex >= 0 ? `(#${selectedPageIndex + 1})` : ''}
              </button>

              <button
                type="button"
                onClick={() => setPosition('end')}
                className={`p-2 text-xs rounded-lg border text-center transition-colors cursor-pointer ${
                  position === 'end'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                End of Document
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/70 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmInsert}
            disabled={isProcessing || (insertType === 'image' && !imageFile)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Insert Page</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
