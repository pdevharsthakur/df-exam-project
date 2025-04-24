/**
 * Path utility functions
 */
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project directories
export const PROJECT_ROOT = path.resolve(__dirname, '../..');
export const DIST_DIR = path.resolve(PROJECT_ROOT, 'dist');
export const PYTHON_DIR = path.resolve(PROJECT_ROOT, 'python');
export const DOCS_DIR = path.resolve(PROJECT_ROOT, 'docs');

// Python script locations
export const PYTHON_SCRIPT_PATH = path.resolve(PYTHON_DIR, 'analyzer.py');

/**
 * Resolves a path relative to the project root
 *
 * @param relativePath Path relative to project root
 * @returns Absolute path
 */
export function resolveFromRoot(relativePath: string): string {
  return path.resolve(PROJECT_ROOT, relativePath);
}

/**
 * Creates a timestamped filename
 *
 * @param prefix Prefix for the filename
 * @param extension File extension (without dot)
 * @returns Timestamped filename
 */
export function createTimestampedFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  return `${prefix}-${timestamp}.${extension}`;
}

/**
 * Ensures a path has the specified extension
 *
 * @param filePath Path to check/modify
 * @param extension Extension to ensure (with or without dot)
 * @returns Path with extension
 */
export function ensureExtension(filePath: string, extension: string): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return filePath.endsWith(ext) ? filePath : `${filePath}${ext}`;
}
