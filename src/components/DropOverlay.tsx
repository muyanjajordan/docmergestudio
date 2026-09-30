import React, { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';

interface DropOverlayProps {
  onDropFiles: (files: FileList) => void;
}

export const DropOverlay: React.FC<DropOverlayProps> = ({ onDropFiles }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      // Only trigger for external file drags, not internal page element drags
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounter++;
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragOver(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onDropFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onDropFiles]);

  if (!isDragOver) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-8 pointer-events-none animate-in fade-in duration-100">
      <div className="bg-white border-2 border-dashed border-blue-500 rounded-2xl p-10 flex flex-col items-center text-center shadow-2xl max-w-md animate-in zoom-in-95 duration-100">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 animate-bounce" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900">Drop PDF files to import</h3>
        <p className="text-xs text-neutral-500 mt-1">
          Add to current workspace or merge with existing documents
        </p>
      </div>
    </div>
  );
};
