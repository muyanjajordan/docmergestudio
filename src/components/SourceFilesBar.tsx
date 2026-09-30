import React, { useRef } from 'react';
import { Upload, ChevronUp, ChevronDown, Trash2, CheckSquare, Layers, FileText } from 'lucide-react';
import { UploadedPdfFile } from '../types/pdf';
import { formatBytes } from '../utils/pdfHelper';

interface SourceFilesBarProps {
  files: UploadedPdfFile[];
  onUploadFiles: (fileList: FileList | File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onMoveFileOrder: (fileId: string, direction: 'up' | 'down') => void;
  onSelectPagesOfFile: (fileId: string) => void;
  isProcessing: boolean;
}

export const SourceFilesBar: React.FC<SourceFilesBarProps> = ({
  files,
  onUploadFiles,
  onRemoveFile,
  onMoveFileOrder,
  onSelectPagesOfFile,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Section title & Add file button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-neutral-500" />
            <span>Source Files ({files.length})</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            id="pdf-upload-input"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add More PDFs</span>
          </button>
        </div>

        {/* Right: Horizontally scrollable list of source documents */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {files.map((file, idx) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md text-xs group shrink-0 transition-colors"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: file.color }}
                title={`Document theme: ${file.color}`}
              />

              <div className="flex items-center gap-1.5 max-w-[140px] sm:max-w-[200px]">
                <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="font-medium text-neutral-800 truncate" title={file.name}>
                  {file.name}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-neutral-500 shrink-0 tabular-nums">
                <span>{file.pageCount}p</span>
                <span>·</span>
                <span>{formatBytes(file.size)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-0.5 ml-1 border-l border-neutral-200 pl-1.5">
                <button
                  onClick={() => onSelectPagesOfFile(file.id)}
                  title="Select all pages from this file"
                  className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-white rounded transition-colors"
                >
                  <CheckSquare className="w-3 h-3" />
                </button>

                <button
                  onClick={() => onMoveFileOrder(file.id, 'up')}
                  disabled={idx === 0}
                  title="Move all pages of this file earlier"
                  className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-white rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>

                <button
                  onClick={() => onMoveFileOrder(file.id, 'down')}
                  disabled={idx === files.length - 1}
                  title="Move all pages of this file later"
                  className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-white rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>

                <button
                  onClick={() => onRemoveFile(file.id)}
                  title="Remove this document and all its pages"
                  className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-white rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
