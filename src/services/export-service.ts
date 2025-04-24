/**
 * @file Export service for saving analysis results to files
 * @description
 * This service handles exporting forensic analysis results to files in different formats.
 * It provides functionality to save results as either structured JSON or formatted text,
 * managing file paths, directory creation, and proper formatting of the exported data.
 * 
 * The ExportService provides:
 * - Export of analysis results in JSON or text format
 * - Automatic creation of output directories as needed
 * - Timestamped filenames for result traceability
 * - Path resolution and validation
 * - ANSI code stripping for clean text output
 * 
 * @module Services/ExportService
 */
import path from 'path';
import chalk from 'chalk';
import { type Ora } from 'ora';

import { AnalysisResult, ExportConfig } from '../types/index.js';
import { DOCS_DIR } from '../utils/paths.js';
import { writeFile, isDirectory, ensureDir, stripAnsiCodes } from '../utils/fs-utils.js';
import { createTimestampedFilename, ensureExtension } from '../utils/paths.js';

/**
 * Service for exporting analysis results to files with support for
 * multiple formats and customizable export locations
 */
export class ExportService {
  /**
   * Exports analysis results to a file with proper formatting
   *
   * @param config Export configuration with format, path and data to export
   * @param spinner Optional spinner for visual progress indication
   * @returns Promise that resolves to the final path where data was exported
   */
  async exportResults(config: ExportConfig, spinner?: Ora): Promise<string> {
    const { format, path: exportPath, data } = config;

    try {
      // Determine the final export path
      const finalPath = await this.resolveFinalPath(exportPath, format);

      if (spinner) {
        spinner.text = `Exporting to ${finalPath}...`;
      }

      // Format the data appropriately
      let formattedData: string;

      if (format === 'json') {
        // JSON formatting - for structured AnalysisResult[] data
        if (Array.isArray(data)) {
          formattedData = JSON.stringify(data, null, 2);
        } else {
          // If it's already a string (should be rare for JSON format), just use it
          formattedData = data;
        }
      } else {
        // Text formatting - strip ANSI codes for clean text output
        if (typeof data === 'string') {
          formattedData = stripAnsiCodes(data);
        } else {
          formattedData = stripAnsiCodes(JSON.stringify(data, null, 2));
        }
      }

      // Write the file
      await writeFile(finalPath, formattedData);

      if (spinner) {
        spinner.succeed(chalk.green(`Results exported successfully to: ${finalPath}`));
      }

      return finalPath;
    } catch (err) {
      if (spinner) {
        spinner.fail(chalk.red(`Failed to export results: ${err}`));
      }
      throw err;
    }
  }

  /**
   * Resolves the final export path, ensuring directories exist and
   * file extensions are appropriate for the chosen format
   *
   * @param exportPath User-provided export path (or empty for default)
   * @param format Export format ('json' or 'text')
   * @returns Promise resolving to the final absolute file path
   */
  private async resolveFinalPath(exportPath: string, format: 'json' | 'text'): Promise<string> {
    const extension = format === 'json' ? 'json' : 'txt';

    // If no path provided, use default
    if (!exportPath) {
      await ensureDir(DOCS_DIR);
      return path.join(DOCS_DIR, createTimestampedFilename('forensic-analysis', extension));
    }

    const resolvedPath = path.resolve(exportPath);

    // Check if path points to a directory
    const isDir = await isDirectory(resolvedPath);

    if (isDir) {
      // It's a directory, append a filename
      await ensureDir(resolvedPath);
      return path.join(resolvedPath, createTimestampedFilename('forensic-analysis', extension));
    } else {
      // It's a file or doesn't exist yet - ensure extension is correct
      const pathWithExt = ensureExtension(resolvedPath, extension);

      // Ensure parent directory exists
      const dir = path.dirname(pathWithExt);
      await ensureDir(dir);

      return pathWithExt;
    }
  }
}
