/**
 * Service to manage report history
 */
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

import { AnalysisResult, ReportHistoryItem, VerificationResult } from '../types/index.js';
import { ensureDir, isFile, stripAnsiCodes } from '../utils/fs-utils.js';
import { createVerificationHash, createReportContentForHashing, verifyContent } from '../utils/hash-utils.js';
import { formatResults } from '../core/formatter.js';

/**
 * Service for managing report history
 */
export class ReportHistoryService {
  private readonly dbDir: string;
  private readonly historyFilePath: string;

  constructor() {
    this.dbDir = path.resolve('db');
    this.historyFilePath = path.join(this.dbDir, 'report-history.json');
  }

  /**
   * Generate a unique report ID
   *
   * @returns Unique report ID (UUID v4)
   */
  generateReportId(): string {
    return uuidv4();
  }

  /**
   * Saves a report to the history database
   *
   * @param results Analysis results to save
   * @returns Promise resolving to the report ID
   */
  async saveReport(results: AnalysisResult[]): Promise<string> {
    // Make sure the db directory exists
    await ensureDir(this.dbDir);

    // Generate a report ID
    const reportId = this.generateReportId();

    // Update each result with the report ID
    results.forEach(result => {
      result.report_id = reportId;
    });

    // Generate the formatted output first
    const formattedOutput = formatResults(results, false);

    // For verification, we'll save both the raw data hash and the formatted output hash
    // Raw data hash - verifies internal data integrity
    const dataHash = createVerificationHash(JSON.stringify(results));

    // Formatted output hash - verifies report presentation hasn't been modified
    // We'll normalize it by removing the report ID and timestamp which will always be different
    const normalizedOutput = stripAnsiCodes(formattedOutput)
      .replace(/Report ID:.*$/m, 'Report ID: PLACEHOLDER')
      .replace(/Generated:.*$/m, 'Generated: PLACEHOLDER');

    const outputHash = createVerificationHash(normalizedOutput);

    // Combined hash separated by a marker
    const verificationHash = `data:${dataHash}||output:${outputHash}`;

    // Create a history item
    const historyItem: ReportHistoryItem = {
      report_id: reportId,
      timestamp: new Date().toISOString(),
      analyzed_files: results.map(result => ({
        file_name: result.file_name,
        file_path: result.file_path,
      })),
      results: results,
      verification_hash: verificationHash,
    };

    try {
      // Load existing history or create a new one
      let history: ReportHistoryItem[] = [];

      const historyExists = await isFile(this.historyFilePath);
      if (historyExists) {
        const historyData = await fs.readFile(this.historyFilePath, 'utf8');
        history = JSON.parse(historyData);
      }

      // Add the new report
      history.push(historyItem);

      // Save the updated history
      await fs.writeFile(this.historyFilePath, JSON.stringify(history, null, 2), 'utf8');

      return reportId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.yellow(`Warning: Failed to save report history: ${errorMessage}`));
      return reportId;
    }
  }

  /**
   * Retrieves the complete report history
   *
   * @returns Promise resolving to the history items
   */
  async getReportHistory(): Promise<ReportHistoryItem[]> {
    try {
      const historyExists = await isFile(this.historyFilePath);
      if (!historyExists) {
        return [];
      }

      const historyData = await fs.readFile(this.historyFilePath, 'utf8');
      return JSON.parse(historyData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error retrieving report history: ${errorMessage}`));
      return [];
    }
  }

  /**
   * Find a report in history by ID
   *
   * @param reportId Report ID to find
   * @returns The found report or undefined if not found
   */
  async findReportById(reportId: string): Promise<ReportHistoryItem | undefined> {
    const history = await this.getReportHistory();
    return history.find(item => item.report_id === reportId);
  }

  /**
   * Verify a report file against the stored verification hash
   *
   * @param filePath Path to the report file
   * @returns Verification result
   */
  async verifyReportFile(filePath: string): Promise<VerificationResult | null> {
    try {
      // Check if file exists
      await fs.access(filePath);

      // Read the file
      let fileData = await fs.readFile(filePath, 'utf8');

      // Strip ANSI color codes that might interfere with regex matching
      fileData = stripAnsiCodes(fileData);

      // Try different regex patterns to find the report ID
      let reportIdMatch = fileData.match(
        /Report ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
      );

      if (!reportIdMatch || !reportIdMatch[1]) {
        // Try a more lenient pattern
        reportIdMatch = fileData.match(/Report\s*ID:?\s*([0-9a-f-]{36})/i);

        if (!reportIdMatch || !reportIdMatch[1]) {
          throw new Error('No report ID found in the file');
        }
      }

      const reportId = reportIdMatch[1];
      console.log(`Found Report ID: ${reportId}`);

      // Find the report in history
      const historyItem = await this.findReportById(reportId);
      if (!historyItem) {
        throw new Error(`Report with ID ${reportId} not found in history`);
      }

      // Split the verification hash to get both data and output hashes
      const hashParts = historyItem.verification_hash.split('||');

      if (hashParts.length !== 2 || !hashParts[0].startsWith('data:') || !hashParts[1].startsWith('output:')) {
        // Backwards compatibility for older reports that only have data hash
        const dataHash = historyItem.verification_hash;
        const dataToVerify = JSON.stringify(historyItem.results);
        return {
          report_id: reportId,
          is_authentic: verifyContent(dataToVerify, dataHash),
          timestamp: historyItem.timestamp,
          analyzed_files: historyItem.analyzed_files,
        };
      }

      const dataHash = hashParts[0].substring(5);
      const outputHash = hashParts[1].substring(7);

      // Verify both the internal data and the report format
      const dataToVerify = JSON.stringify(historyItem.results);
      const dataIsAuthentic = verifyContent(dataToVerify, dataHash);

      // Normalize the file content the same way we did when creating the hash
      const normalizedFileContent = fileData
        .replace(/Report ID:.*$/m, 'Report ID: PLACEHOLDER')
        .replace(/Generated:.*$/m, 'Generated: PLACEHOLDER');

      const outputIsAuthentic = verifyContent(normalizedFileContent, outputHash);

      // A report is authentic only if both data and output format match
      const isAuthentic = dataIsAuthentic && outputIsAuthentic;

      return {
        report_id: reportId,
        is_authentic: isAuthentic,
        timestamp: historyItem.timestamp,
        analyzed_files: historyItem.analyzed_files,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error verifying report: ${errorMessage}`));
      return null;
    }
  }

  /**
   * Formats report history into a human-readable string
   *
   * @param history Report history items
   * @returns Formatted string
   */
  formatReportHistory(history: ReportHistoryItem[]): string {
    if (history.length === 0) {
      return chalk.yellow('\nNo reports found in history.\n');
    }

    let output = chalk.bold.blue('\n🔍 DIGITAL FORENSIC ANALYSIS REPORT HISTORY\n\n');

    // Sort history by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    history.forEach((item, index) => {
      const date = new Date(item.timestamp).toLocaleString();
      output += chalk.white(`${chalk.bold.green(`Report #${index + 1}`)}\n`);
      output += chalk.white(`${chalk.dim('ID:')} ${item.report_id}\n`);
      output += chalk.white(`${chalk.dim('Date:')} ${date}\n`);

      // List analyzed files
      output += chalk.white(`${chalk.dim('Files:')}\n`);
      item.analyzed_files.forEach(file => {
        output += chalk.white(`  - ${file.file_name}\n`);
      });

      output += '\n';
    });

    return output;
  }

  /**
   * Format verification result
   *
   * @param result Verification result
   * @returns Formatted string
   */
  formatVerificationResult(result: VerificationResult): string {
    let output = chalk.bold.blue('\n🔐 REPORT VERIFICATION RESULT\n\n');

    output += chalk.white(`${chalk.dim('Report ID:')} ${result.report_id}\n`);
    output += chalk.white(`${chalk.dim('Original Date:')} ${new Date(result.timestamp).toLocaleString()}\n`);

    // Show authentication result
    if (result.is_authentic) {
      output += chalk.bold.green('\n✅ VERIFIED: This report is authentic and has not been modified.\n\n');
    } else {
      output += chalk.bold.red('\n❌ WARNING: This report appears to have been modified since it was created!\n\n');
    }

    // List original files that were analyzed
    output += chalk.white(`${chalk.dim('Original Files Analyzed:')}\n`);
    result.analyzed_files.forEach(file => {
      output += chalk.white(`  - ${file.file_name}\n`);
    });

    return output;
  }
}
