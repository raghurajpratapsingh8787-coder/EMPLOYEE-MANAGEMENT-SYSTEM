import path from 'path';

/**
 * Recursively strips keys beginning with '$' or containing '.' to prevent NoSQL operator injection.
 */
export function sanitizeNoSqlPayload<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeNoSqlPayload(item)) as unknown as T;
  }
  if (typeof input === 'object' && !(input instanceof Date)) {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      clean[key] = sanitizeNoSqlPayload(value);
    }
    return clean as T;
  }
  return input;
}

/**
 * Validates image file buffer magic bytes (JPEG, PNG, WEBP only).
 */
export function detectSafeImageType(buffer: Buffer): { ext: '.jpg' | '.png' | '.webp'; mime: string } | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: '.png', mime: 'image/png' };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }

  return null;
}

/**
 * Resolves a filename strictly inside a target base directory, preventing path traversal.
 */
export function resolveConfinedPath(baseDir: string, unsafeFilename: string): string {
  const safeBasename = path.basename(unsafeFilename);
  if (!safeBasename || safeBasename !== unsafeFilename || safeBasename.includes('..')) {
    throw new Error('Invalid file path');
  }
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, safeBasename);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error('Path traversal attempt blocked');
  }
  return resolvedTarget;
}
