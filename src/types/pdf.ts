export interface UploadedPdfFile {
  id: string;
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
  pageCount: number;
  color: string;
}

export interface PdfPageItem {
  id: string;
  sourceFileId: string;
  sourceFileName: string;
  sourcePageIndex: number; // 0-indexed
  originalPageNumber: number; // 1-indexed
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl: string | null;
  aspectRatio: number; // width / height
  fileColor: string;
  width: number;
  height: number;
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  color: string; // hex
  opacity: number; // 0.1 to 0.9
  fontSize: number; // 24 to 72
  rotation: number; // -45, 0, 45
  applyTo: 'all' | 'selected';
}

export interface DocumentMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
}

export interface PageNumberSettings {
  enabled: boolean;
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right';
  format: 'page_x_of_y' | 'x_of_y' | 'dash_x' | 'just_x';
  startFrom: number;
  skipFirstPage: boolean;
}

export interface ExportSettings {
  fileName: string;
  pageNumbers: PageNumberSettings;
  watermark: WatermarkSettings;
  metadata: DocumentMetadata;
  pageSize: 'original' | 'a4' | 'letter';
}

export type ViewMode = 'grid' | 'compact' | 'grouped';

export interface SplitOptions {
  mode: 'single_pages' | 'every_n_pages' | 'selected_only' | 'by_document';
  everyN: number;
  zipFileName: string;
}
