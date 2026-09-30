import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { ExportSettings, PdfPageItem, SplitOptions } from '../types/pdf';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (err) {
    console.warn('Could not set pdf.worker url, falling back to cdn', err);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export const FILE_COLORS = [
  '#2563EB', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#0D9488', // Teal
  '#EA580C', // Orange
  '#4F46E5', // Indigo
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Generate a clean placeholder data URL if page rendering fails or while loading
 */
export function createSvgThumbnail(title: string, pageNum: number, color = '#3B82F6'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">
    <rect width="300" height="420" fill="#F8FAFC" rx="4" />
    <rect x="20" y="20" width="260" height="12" rx="3" fill="${color}" opacity="0.3" />
    <rect x="20" y="42" width="180" height="8" rx="2" fill="#CBD5E1" />
    <rect x="20" y="58" width="220" height="8" rx="2" fill="#E2E8F0" />
    <rect x="20" y="80" width="260" height="180" rx="4" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="1"/>
    <circle cx="150" cy="170" r="28" fill="${color}" opacity="0.15" />
    <text x="150" y="176" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="${color}" text-anchor="middle">p. ${pageNum}</text>
    <rect x="20" y="280" width="260" height="8" rx="2" fill="#E2E8F0" />
    <rect x="20" y="296" width="240" height="8" rx="2" fill="#E2E8F0" />
    <rect x="20" y="312" width="210" height="8" rx="2" fill="#E2E8F0" />
    <rect x="20" y="328" width="160" height="8" rx="2" fill="#E2E8F0" />
    <text x="20" y="390" font-family="system-ui, sans-serif" font-size="11" fill="#64748B">${escapeXml(title.slice(0, 30))}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Render a single page thumbnail using PDF.js
 */
export async function renderPageThumbnail(
  arrayBuffer: ArrayBuffer,
  pageIndex: number,
  targetWidth = 360
): Promise<{ thumbnailUrl: string; aspectRatio: number; width: number; height: number }> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0)),
    });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(pageIndex + 1);

    const viewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(scaledViewport.width);
    canvas.height = Math.floor(scaledViewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport,
    };

    await page.render(renderContext as any).promise;
    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.88);
    const aspectRatio = viewport.width / viewport.height;

    pdfDoc.cleanup();
    loadingTask.destroy();

    return {
      thumbnailUrl,
      aspectRatio,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
    };
  } catch (error) {
    console.warn(`Could not render thumbnail for page ${pageIndex}:`, error);
    return {
      thumbnailUrl: createSvgThumbnail('Page', pageIndex + 1),
      aspectRatio: 300 / 420,
      width: 595,
      height: 842,
    };
  }
}

/**
 * Extract all pages from a newly uploaded PDF file
 */
export async function extractPagesFromPdf(
  fileId: string,
  fileName: string,
  arrayBuffer: ArrayBuffer,
  fileColor: string,
  onProgress?: (current: number, total: number) => void
): Promise<PdfPageItem[]> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer.slice(0)),
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: PdfPageItem[] = [];

  for (let i = 0; i < numPages; i++) {
    const pageNum = i + 1;
    let thumbData = {
      thumbnailUrl: createSvgThumbnail(fileName, pageNum, fileColor),
      aspectRatio: 300 / 420,
      width: 595,
      height: 842,
    };

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const targetWidth = 360;
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(scaledViewport.width);
      canvas.height = Math.floor(scaledViewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
        } as any).promise;

        thumbData = {
          thumbnailUrl: canvas.toDataURL('image/jpeg', 0.88),
          aspectRatio: viewport.width / viewport.height,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        };
      }
    } catch (renderErr) {
      console.warn(`Failed rendering page ${pageNum} for ${fileName}`, renderErr);
    }

    pages.push({
      id: `${fileId}-p${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceFileId: fileId,
      sourceFileName: fileName,
      sourcePageIndex: i,
      originalPageNumber: pageNum,
      rotation: 0,
      thumbnailUrl: thumbData.thumbnailUrl,
      aspectRatio: thumbData.aspectRatio,
      fileColor,
      width: thumbData.width,
      height: thumbData.height,
    });

    if (onProgress) {
      onProgress(pageNum, numPages);
    }
  }

  pdfDoc.cleanup();
  loadingTask.destroy();
  return pages;
}

/**
 * Create a blank PDF page (A4 or US Letter, portrait or landscape)
 */
export async function createBlankPagePdf(
  paperSize: 'a4' | 'letter' = 'a4',
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<{ buffer: ArrayBuffer; width: number; height: number; thumbnailUrl: string }> {
  const doc = await PDFDocument.create();
  let width = paperSize === 'a4' ? 595.28 : 612.0;
  let height = paperSize === 'a4' ? 841.89 : 792.0;

  if (orientation === 'landscape') {
    const temp = width;
    width = height;
    height = temp;
  }

  const page = doc.addPage([width, height]);
  // Light border indicator on the blank canvas so user sees the page boundary
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: rgb(0.92, 0.94, 0.96),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  const pdfBytes = await doc.save();
  const buffer = pdfBytes.buffer as ArrayBuffer;

  const thumb = await renderPageThumbnail(buffer, 0, 360);

  return {
    buffer,
    width,
    height,
    thumbnailUrl: thumb.thumbnailUrl,
  };
}

/**
 * Convert an image (PNG, JPG, WebP) into a high-fidelity PDF page
 */
export async function createImagePagePdf(
  imageFile: File,
  fitToA4 = true
): Promise<{ buffer: ArrayBuffer; width: number; height: number; thumbnailUrl: string }> {
  const doc = await PDFDocument.create();
  const arrayBuffer = await imageFile.arrayBuffer();

  let embeddedImage;
  if (imageFile.type === 'image/jpeg' || imageFile.name.toLowerCase().endsWith('.jpg') || imageFile.name.toLowerCase().endsWith('.jpeg')) {
    embeddedImage = await doc.embedJpg(arrayBuffer);
  } else {
    // For PNG and other formats, draw to canvas to obtain clean PNG bytes
    const imgBitmap = await createImageBitmap(imageFile);
    const canvas = document.createElement('canvas');
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imgBitmap, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
    const pngBuffer = await pngBlob.arrayBuffer();
    embeddedImage = await doc.embedPng(pngBuffer);
  }

  const imgWidth = embeddedImage.width;
  const imgHeight = embeddedImage.height;

  let pageWidth = imgWidth;
  let pageHeight = imgHeight;
  let drawX = 0;
  let drawY = 0;
  let drawWidth = imgWidth;
  let drawHeight = imgHeight;

  if (fitToA4) {
    const isLandscape = imgWidth > imgHeight;
    pageWidth = isLandscape ? 841.89 : 595.28;
    pageHeight = isLandscape ? 595.28 : 841.89;

    const margin = 36; // 0.5 inch margins
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    drawWidth = imgWidth * scale;
    drawHeight = imgHeight * scale;

    drawX = (pageWidth - drawWidth) / 2;
    drawY = (pageHeight - drawHeight) / 2;
  }

  const page = doc.addPage([pageWidth, pageHeight]);
  page.drawImage(embeddedImage, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  });

  const pdfBytes = await doc.save();
  const buffer = pdfBytes.buffer as ArrayBuffer;
  const thumb = await renderPageThumbnail(buffer, 0, 360);

  return {
    buffer,
    width: pageWidth,
    height: pageHeight,
    thumbnailUrl: thumb.thumbnailUrl,
  };
}

/**
 * Merge pages in the specified order and export as a new PDF with watermarking and numbering
 */
export async function mergePdfPages(
  fileBuffers: Map<string, ArrayBuffer>,
  pages: PdfPageItem[],
  settings: ExportSettings,
  selectedPageIds?: Set<string>
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  // Set document metadata if provided
  if (settings.metadata) {
    if (settings.metadata.title) mergedPdf.setTitle(settings.metadata.title);
    if (settings.metadata.author) mergedPdf.setAuthor(settings.metadata.author);
    if (settings.metadata.subject) mergedPdf.setSubject(settings.metadata.subject);
    if (settings.metadata.keywords) mergedPdf.setKeywords(settings.metadata.keywords.split(',').map((k) => k.trim()));
    mergedPdf.setProducer('DocuMerge Studio');
  }

  // Cache loaded source documents to prevent re-parsing
  const docCache = new Map<string, PDFDocument>();
  for (const [fileId, buffer] of fileBuffers.entries()) {
    try {
      const doc = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: true });
      docCache.set(fileId, doc);
    } catch (err) {
      console.error(`Failed to load source document ${fileId}`, err);
    }
  }

  // Iterate over user-arranged pages
  for (let idx = 0; idx < pages.length; idx++) {
    const pageItem = pages[idx];
    const sourceDoc = docCache.get(pageItem.sourceFileId);

    if (!sourceDoc) {
      continue;
    }

    const [copiedPage] = await mergedPdf.copyPages(sourceDoc, [pageItem.sourcePageIndex]);

    // Handle rotation: combine inherent rotation with user rotation
    const inherentRotation = copiedPage.getRotation().angle;
    const finalRotation = (inherentRotation + pageItem.rotation) % 360;
    copiedPage.setRotation(degrees(finalRotation));

    mergedPdf.addPage(copiedPage);
  }

  const totalPages = mergedPdf.getPageCount();

  // Embed standard fonts for stamps
  let helveticaFont;
  let helveticaBold;
  if (settings.pageNumbers.enabled || settings.watermark.enabled) {
    helveticaFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
    helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
  }

  // Apply Watermarks
  if (settings.watermark.enabled && settings.watermark.text.trim().length > 0 && helveticaBold) {
    const wmText = settings.watermark.text.trim();
    const rgbColor = hexToRgb(settings.watermark.color || '#DC2626');
    const colorObj = rgb(rgbColor.r, rgbColor.g, rgbColor.b);
    const fontSize = settings.watermark.fontSize || 42;
    const opacity = settings.watermark.opacity || 0.25;
    const rotDegrees = settings.watermark.rotation || 45;

    for (let i = 0; i < totalPages; i++) {
      const pageItem = pages[i];
      if (settings.watermark.applyTo === 'selected' && selectedPageIds && !selectedPageIds.has(pageItem.id)) {
        continue;
      }

      const page = mergedPdf.getPage(i);
      const { width, height } = page.getSize();
      const textWidth = helveticaBold.widthOfTextAtSize(wmText, fontSize);
      const textHeight = helveticaBold.heightAtSize(fontSize);

      // Centered position
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw rotated watermark text centered on page
      page.drawText(wmText, {
        x: centerX - (textWidth / 2) * Math.cos((rotDegrees * Math.PI) / 180),
        y: centerY - (textWidth / 2) * Math.sin((rotDegrees * Math.PI) / 180),
        size: fontSize,
        font: helveticaBold,
        color: colorObj,
        opacity,
        rotate: degrees(rotDegrees),
      });
    }
  }

  // Apply continuous page numbers
  if (settings.pageNumbers.enabled && helveticaFont && totalPages > 0) {
    const pSettings = settings.pageNumbers;
    const startNum = pSettings.startFrom || 1;

    for (let i = 0; i < totalPages; i++) {
      if (pSettings.skipFirstPage && i === 0) {
        continue;
      }

      const page = mergedPdf.getPage(i);
      const { width, height } = page.getSize();
      const currentNumber = startNum + (pSettings.skipFirstPage ? i - 1 : i);
      const displayTotal = pSettings.skipFirstPage ? totalPages - 1 : totalPages;

      let label = `Page ${currentNumber} of ${displayTotal}`;
      if (pSettings.format === 'x_of_y') {
        label = `${currentNumber} / ${displayTotal}`;
      } else if (pSettings.format === 'dash_x') {
        label = `- ${currentNumber} -`;
      } else if (pSettings.format === 'just_x') {
        label = `${currentNumber}`;
      }

      const textSize = 9;
      const textWidth = helveticaFont.widthOfTextAtSize(label, textSize);

      let x = (width - textWidth) / 2;
      let y = 20;

      switch (pSettings.position) {
        case 'bottom-right':
          x = width - textWidth - 30;
          y = 20;
          break;
        case 'bottom-left':
          x = 30;
          y = 20;
          break;
        case 'top-center':
          x = (width - textWidth) / 2;
          y = height - 25;
          break;
        case 'top-right':
          x = width - textWidth - 30;
          y = height - 25;
          break;
        case 'bottom-center':
        default:
          x = (width - textWidth) / 2;
          y = 20;
          break;
      }

      page.drawText(label, {
        x,
        y,
        size: textSize,
        font: helveticaFont,
        color: rgb(0.25, 0.3, 0.38),
      });
    }
  }

  return await mergedPdf.save();
}

/**
 * Split PDF according to user configuration and bundle as ZIP (or single PDF if selected_only)
 */
export async function splitAndExportPdf(
  fileBuffers: Map<string, ArrayBuffer>,
  pages: PdfPageItem[],
  options: SplitOptions,
  settings: ExportSettings,
  selectedPageIds: Set<string>,
  onProgress?: (status: string) => void
): Promise<{ zipBlob?: Blob; singlePdfBytes?: Uint8Array; fileName: string; count: number }> {
  // 1. Selected Pages Only -> Single PDF
  if (options.mode === 'selected_only') {
    const selectedPages = pages.filter((p) => selectedPageIds.has(p.id));
    if (selectedPages.length === 0) {
      throw new Error('No pages selected to extract');
    }
    const pdfBytes = await mergePdfPages(fileBuffers, selectedPages, settings);
    return {
      singlePdfBytes: pdfBytes,
      fileName: 'extracted_selected_pages.pdf',
      count: selectedPages.length,
    };
  }

  // 2. Multi-file split bundled into ZIP archive
  const zip = new JSZip();

  if (options.mode === 'single_pages') {
    // 1 PDF per page
    for (let i = 0; i < pages.length; i++) {
      if (onProgress) onProgress(`Exporting page ${i + 1} of ${pages.length}...`);
      const singlePageDoc = await mergePdfPages(fileBuffers, [pages[i]], settings);
      const pageIndexPadded = String(i + 1).padStart(3, '0');
      zip.file(`page_${pageIndexPadded}.pdf`, singlePageDoc);
    }
    if (onProgress) onProgress('Compressing ZIP archive...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      zipBlob,
      fileName: options.zipFileName || 'split_pages.zip',
      count: pages.length,
    };
  }

  if (options.mode === 'every_n_pages') {
    const n = Math.max(1, options.everyN || 2);
    let partNum = 1;
    for (let i = 0; i < pages.length; i += n) {
      const slice = pages.slice(i, i + n);
      if (onProgress) onProgress(`Packaging part ${partNum} (${slice.length} pages)...`);
      const partDoc = await mergePdfPages(fileBuffers, slice, settings);
      zip.file(`part_${String(partNum).padStart(2, '0')}.pdf`, partDoc);
      partNum++;
    }
    if (onProgress) onProgress('Compressing ZIP archive...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      zipBlob,
      fileName: options.zipFileName || 'split_parts.zip',
      count: partNum - 1,
    };
  }

  if (options.mode === 'by_document') {
    // Group by sourceFileId
    const groups = new Map<string, { name: string; pages: PdfPageItem[] }>();
    pages.forEach((p) => {
      if (!groups.has(p.sourceFileId)) {
        groups.set(p.sourceFileId, { name: p.sourceFileName, pages: [] });
      }
      groups.get(p.sourceFileId)!.pages.push(p);
    });

    let index = 1;
    for (const [, grp] of groups.entries()) {
      if (onProgress) onProgress(`Processing ${grp.name}...`);
      const docBytes = await mergePdfPages(fileBuffers, grp.pages, settings);
      const cleanName = grp.name.replace(/\.pdf$/i, '');
      zip.file(`${String(index).padStart(2, '0')}_${cleanName}_reorganized.pdf`, docBytes);
      index++;
    }
    if (onProgress) onProgress('Compressing ZIP archive...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      zipBlob,
      fileName: options.zipFileName || 'documents_reorganized.zip',
      count: groups.size,
    };
  }

  throw new Error('Unsupported split mode');
}

/**
 * Generate 3 realistic sample PDF files with rich content
 */
export async function createSamplePdfs(): Promise<{ name: string; buffer: ArrayBuffer; color: string }[]> {
  const fontColorDark = rgb(0.1, 0.12, 0.18);
  const fontColorMuted = rgb(0.35, 0.4, 0.48);
  const colorBlue = rgb(0.15, 0.38, 0.92);
  const colorGreen = rgb(0.05, 0.6, 0.38);
  const colorAmber = rgb(0.85, 0.48, 0.05);

  // 1. Q1 Financial Performance & Revenue Summary (3 Pages)
  const doc1 = await PDFDocument.create();
  const fontBold = await doc1.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc1.embedFont(StandardFonts.Helvetica);

  // Page 1: Executive Summary
  const p1_1 = doc1.addPage([595.28, 841.89]); // A4
  p1_1.drawRectangle({ x: 40, y: 760, width: 515, height: 40, color: rgb(0.95, 0.96, 0.98) });
  p1_1.drawText('QUARTERLY FINANCIAL REPORT', { x: 50, y: 775, size: 14, font: fontBold, color: colorBlue });
  p1_1.drawText('Q1 2026 Executive Performance & Revenue Review', { x: 50, y: 720, size: 20, font: fontBold, color: fontColorDark });
  p1_1.drawText('Prepared for Stakeholders & Executive Leadership · Published April 2026', { x: 50, y: 695, size: 10, font: fontRegular, color: fontColorMuted });

  p1_1.drawRectangle({ x: 50, y: 550, width: 240, height: 110, color: rgb(0.97, 0.98, 1.0), borderColor: rgb(0.85, 0.9, 1.0), borderWidth: 1 });
  p1_1.drawText('Total Revenue', { x: 65, y: 630, size: 11, font: fontRegular, color: fontColorMuted });
  p1_1.drawText('$14,820,000', { x: 65, y: 595, size: 22, font: fontBold, color: colorBlue });
  p1_1.drawText('+28.4% YoY Growth vs Q1 Prior Year', { x: 65, y: 570, size: 9, font: fontRegular, color: colorGreen });

  p1_1.drawRectangle({ x: 305, y: 550, width: 240, height: 110, color: rgb(0.97, 1.0, 0.98), borderColor: rgb(0.85, 0.96, 0.9), borderWidth: 1 });
  p1_1.drawText('Operating Margin', { x: 320, y: 630, size: 11, font: fontRegular, color: fontColorMuted });
  p1_1.drawText('32.6%', { x: 320, y: 595, size: 22, font: fontBold, color: colorGreen });
  p1_1.drawText('+410 bps expansion driven by platform scale', { x: 320, y: 570, size: 9, font: fontRegular, color: fontColorMuted });

  p1_1.drawText('Strategic Highlights', { x: 50, y: 500, size: 14, font: fontBold, color: fontColorDark });
  p1_1.drawText('1. Core software subscriptions expanded by 34% across enterprise accounts.', { x: 50, y: 470, size: 10, font: fontRegular, color: fontColorDark });
  p1_1.drawText('2. Net dollar retention reached 119%, confirming strong multi-product adoption.', { x: 50, y: 445, size: 10, font: fontRegular, color: fontColorDark });
  p1_1.drawText('3. International operations contributed 42% of gross receipts with zero FX friction.', { x: 50, y: 420, size: 10, font: fontRegular, color: fontColorDark });
  p1_1.drawText('Confidential · DocuMerge Financial Audit Series', { x: 50, y: 40, size: 8, font: fontRegular, color: fontColorMuted });

  // Page 2: Segment Breakdown
  const p1_2 = doc1.addPage([595.28, 841.89]);
  p1_2.drawText('Segment Breakdown & Customer Segments', { x: 50, y: 770, size: 16, font: fontBold, color: fontColorDark });
  p1_2.drawText('Segment', { x: 50, y: 720, size: 10, font: fontBold, color: fontColorMuted });
  p1_2.drawText('Q1 Revenue', { x: 220, y: 720, size: 10, font: fontBold, color: fontColorMuted });
  p1_2.drawText('Growth YoY', { x: 350, y: 720, size: 10, font: fontBold, color: fontColorMuted });
  p1_2.drawText('Share', { x: 480, y: 720, size: 10, font: fontBold, color: fontColorMuted });
  p1_2.drawLine({ start: { x: 50, y: 710 }, end: { x: 545, y: 710 }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });

  const rows = [
    ['Enterprise SaaS Solutions', '$8,450,000', '+38.2%', '57.0%'],
    ['Mid-Market Workflow Suite', '$4,120,000', '+19.5%', '27.8%'],
    ['Developer APIs & Integrations', '$1,650,000', '+44.1%', '11.1%'],
    ['Professional Implementation', '$600,000', '+4.2%', '4.1%'],
  ];
  rows.forEach((r, idx) => {
    const y = 680 - idx * 35;
    p1_2.drawText(r[0], { x: 50, y, size: 10, font: fontRegular, color: fontColorDark });
    p1_2.drawText(r[1], { x: 220, y, size: 10, font: fontRegular, color: fontColorDark });
    p1_2.drawText(r[2], { x: 350, y, size: 10, font: fontBold, color: colorGreen });
    p1_2.drawText(r[3], { x: 480, y, size: 10, font: fontRegular, color: fontColorDark });
    p1_2.drawLine({ start: { x: 50, y: y - 10 }, end: { x: 545, y: y - 10 }, thickness: 0.5, color: rgb(0.9, 0.92, 0.95) });
  });

  // Page 3: Balance Sheet & Liquidity
  const p1_3 = doc1.addPage([595.28, 841.89]);
  p1_3.drawText('Cash Reserves & Capital Allocation', { x: 50, y: 770, size: 16, font: fontBold, color: fontColorDark });
  p1_3.drawText('Balance Sheet Overview as of March 31, 2026', { x: 50, y: 745, size: 10, font: fontRegular, color: fontColorMuted });
  p1_3.drawRectangle({ x: 50, y: 600, width: 495, height: 110, color: rgb(0.98, 0.98, 0.99), borderColor: rgb(0.88, 0.9, 0.94), borderWidth: 1 });
  p1_3.drawText('Cash and Equivalents: $42,300,000 (Zero long-term debt)', { x: 70, y: 670, size: 11, font: fontBold, color: fontColorDark });
  p1_3.drawText('Free Cash Flow generated in Q1: $4,910,000', { x: 70, y: 645, size: 10, font: fontRegular, color: colorBlue });
  p1_3.drawText('Capital deployed toward R&D and core infrastructure: $2,800,000', { x: 70, y: 620, size: 10, font: fontRegular, color: fontColorMuted });
  const doc1Bytes = await doc1.save();

  // 2. Product Specifications & Architecture Guide (2 Pages)
  const doc2 = await PDFDocument.create();
  const d2FontBold = await doc2.embedFont(StandardFonts.HelveticaBold);
  const d2FontRegular = await doc2.embedFont(StandardFonts.Helvetica);

  const p2_1 = doc2.addPage([595.28, 841.89]);
  p2_1.drawRectangle({ x: 40, y: 760, width: 515, height: 40, color: rgb(0.94, 0.98, 0.96) });
  p2_1.drawText('SYSTEM ARCHITECTURE & SECURITY', { x: 50, y: 775, size: 13, font: d2FontBold, color: colorGreen });
  p2_1.drawText('Technical Implementation Specifications', { x: 50, y: 720, size: 20, font: d2FontBold, color: fontColorDark });
  p2_1.drawText('Document Version 3.4 · Client-Side Data Integrity & Privacy', { x: 50, y: 695, size: 10, font: d2FontRegular, color: fontColorMuted });

  p2_1.drawText('1. Zero-Upload In-Memory Processing', { x: 50, y: 640, size: 13, font: d2FontBold, color: fontColorDark });
  p2_1.drawText('All binary stream manipulations, page extraction, and assembly occur strictly', { x: 50, y: 615, size: 10, font: d2FontRegular, color: fontColorDark });
  p2_1.drawText('within client sandboxed WebAssembly memory buffers. No document payload is transmitted.', { x: 50, y: 598, size: 10, font: d2FontRegular, color: fontColorDark });

  p2_1.drawText('2. Cryptographic Checksums & Hash Integrity', { x: 50, y: 550, size: 13, font: d2FontBold, color: fontColorDark });
  p2_1.drawText('Every imported PDF stream verifies header conformance and xref tables before rendering.', { x: 50, y: 525, size: 10, font: d2FontRegular, color: fontColorDark });

  const p2_2 = doc2.addPage([595.28, 841.89]);
  p2_2.drawText('Compliance & Data Protection Standards', { x: 50, y: 770, size: 16, font: d2FontBold, color: fontColorDark });
  p2_2.drawText('Certified under SOC 2 Type II, ISO/IEC 27001, and HIPAA Security Rule.', { x: 50, y: 740, size: 10, font: d2FontRegular, color: fontColorDark });
  p2_2.drawRectangle({ x: 50, y: 620, width: 495, height: 90, color: rgb(0.96, 0.99, 0.98), borderColor: rgb(0.8, 0.92, 0.86), borderWidth: 1 });
  p2_2.drawText('GDPR / CCPA Exemption Note:', { x: 70, y: 675, size: 11, font: d2FontBold, color: colorGreen });
  p2_2.drawText('Because document parsing executes strictly within the local host context,', { x: 70, y: 652, size: 10, font: d2FontRegular, color: fontColorDark });
  p2_2.drawText('no customer PII is persisted, stored, or processed on remote server infrastructure.', { x: 70, y: 635, size: 10, font: d2FontRegular, color: fontColorDark });
  const doc2Bytes = await doc2.save();

  // 3. Legal Terms & Sign-off Appendix (2 Pages)
  const doc3 = await PDFDocument.create();
  const d3FontBold = await doc3.embedFont(StandardFonts.HelveticaBold);
  const d3FontRegular = await doc3.embedFont(StandardFonts.Helvetica);

  const p3_1 = doc3.addPage([595.28, 841.89]);
  p3_1.drawRectangle({ x: 40, y: 760, width: 515, height: 40, color: rgb(0.99, 0.97, 0.94) });
  p3_1.drawText('APPENDIX & GOVERNING AGREEMENT', { x: 50, y: 775, size: 13, font: d3FontBold, color: colorAmber });
  p3_1.drawText('Service Level Terms & Authorizations', { x: 50, y: 720, size: 20, font: d3FontBold, color: fontColorDark });
  p3_1.drawText('Annexure A to Master Services Agreement · Effective Calendar 2026', { x: 50, y: 695, size: 10, font: d3FontRegular, color: fontColorMuted });

  p3_1.drawText('Section 4.1 - Service Availability & Latency Guarantees', { x: 50, y: 640, size: 12, font: d3FontBold, color: fontColorDark });
  p3_1.drawText('The system shall maintain a minimum of 99.95% operational uptime during monthly billing periods.', { x: 50, y: 615, size: 10, font: d3FontRegular, color: fontColorDark });

  const p3_2 = doc3.addPage([595.28, 841.89]);
  p3_2.drawText('Signatures & Executed Approvals', { x: 50, y: 770, size: 16, font: d3FontBold, color: fontColorDark });
  p3_2.drawText('IN WITNESS WHEREOF, the parties hereto have executed this Addendum.', { x: 50, y: 740, size: 10, font: d3FontRegular, color: fontColorMuted });
  p3_2.drawLine({ start: { x: 50, y: 650 }, end: { x: 260, y: 650 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
  p3_2.drawText('Authorized Signature: Executive Officer', { x: 50, y: 630, size: 10, font: d3FontRegular, color: fontColorDark });

  p3_2.drawLine({ start: { x: 320, y: 650 }, end: { x: 530, y: 650 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
  p3_2.drawText('Countersigned: Legal Counsel & Date', { x: 320, y: 630, size: 10, font: d3FontRegular, color: fontColorDark });
  const doc3Bytes = await doc3.save();

  return [
    {
      name: 'Q1_Financial_Report.pdf',
      buffer: doc1Bytes.buffer as ArrayBuffer,
      color: '#2563EB',
    },
    {
      name: 'System_Architecture_Guide.pdf',
      buffer: doc2Bytes.buffer as ArrayBuffer,
      color: '#059669',
    },
    {
      name: 'Legal_Appendix_Addendum.pdf',
      buffer: doc3Bytes.buffer as ArrayBuffer,
      color: '#D97706',
    },
  ];
}

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
