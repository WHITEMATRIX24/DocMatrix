import { MAX_FILE_SIZE_BYTES } from './storage.service.js';

// Multer enforces these while receiving multipart data, before memory storage
// completes and before the antivirus or document service is called.
export const CLINICAL_UPLOAD_LIMITS = Object.freeze({
  fileSize: MAX_FILE_SIZE_BYTES,
  files: 1,
  fields: 16,
  parts: 17,
  fieldSize: 64 * 1024,
  fieldNameSize: 100,
  headerPairs: 100,
});

export function clinicalDownloadHeaders(
  res: { setHeader: (name: string, value: string) => unknown },
  preview: boolean,
): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // A sandbox without allow-same-origin gives the document an opaque origin.
  // No redirect is permitted for preview, since storage cannot enforce this CSP.
  res.setHeader(
    'Content-Security-Policy',
    "sandbox; default-src 'none'; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
  );
  if (preview) res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}
