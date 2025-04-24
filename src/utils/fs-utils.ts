/**
 * @file File system utility functions
 * @description
 * This file provides utility functions for interacting with the file system.
 * These utilities handle common file operations needed throughout the application,
 * including directory creation, file existence checking, and safe file writing.
 * 
 * The module also provides functionality for handling ANSI escape codes in text output,
 * which is useful when saving colorized console output to files.
 * 
 * @module Utils/FileSystem
 */
import fs from 'fs/promises';
import path from 'path';

/**
 * Regular expression to match ANSI color/formatting escape sequences
 */
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Strips ANSI color codes from a string
 * Used when saving colored console output to plain text files
 *
 * @param text Text with potential ANSI codes
 * @returns Clean text without ANSI codes
 */
export function stripAnsiCodes(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

/**
 * Ensures a directory exists, creating it if needed
 *
 * @param dirPath Directory path to ensure
 * @returns Promise resolving when done
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // Ignore if directory already exists
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }
}

/**
 * Ensures the parent directory of a file exists
 *
 * @param filePath Path to the file
 * @returns Promise resolving when done
 */
export async function ensureFileDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  return ensureDir(dir);
}

/**
 * Checks if a path exists and is a file
 *
 * @param filePath Path to check
 * @returns Promise resolving to boolean
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (err) {
    return false;
  }
}

/**
 * Checks if a path exists and is a directory
 *
 * @param dirPath Path to check
 * @returns Promise resolving to boolean
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
}

/**
 * Write data to a file, ensuring its directory exists
 *
 * @param filePath Path to write to
 * @param data Data to write
 * @returns Promise resolving when done
 */
export async function writeFile(filePath: string, data: string): Promise<void> {
  await ensureFileDir(filePath);
  return fs.writeFile(filePath, data, 'utf8');
}
