/**
 * CLI prompt utilities for interactive user input
 */
import inquirer from 'inquirer';
import chalk from 'chalk';
import { type Ora } from 'ora';

import { AnalysisResult, ExportConfig } from '../types/index.js';
import { ExportService } from '../services/export-service.js';

/**
 * Handles export prompts and processing
 */
export class PromptHandler {
  private exportService: ExportService;

  constructor() {
    this.exportService = new ExportService();
  }

  /**
   * Prompts the user for export preferences and exports the analysis results
   *
   * @param allResults The analysis results to export
   * @param formattedOutput The formatted text output
   * @param createSpinner Function to create a spinner
   * @returns Promise that resolves when export is complete
   */
  async handleExportPrompt(
    allResults: AnalysisResult[],
    formattedOutput: string,
    createSpinner: () => Ora
  ): Promise<void> {
    try {
      // Ask if user wants to export
      const { shouldExport } = await inquirer.prompt<{ shouldExport: boolean }>([
        {
          type: 'confirm',
          name: 'shouldExport',
          message: 'Would you like to export the analysis results?',
          default: false,
        },
      ]);

      if (!shouldExport) {
        console.log(chalk.dim('Export skipped. Exiting program.'));
        return;
      }

      // Ask for export format
      const { exportFormat } = await inquirer.prompt<{ exportFormat: 'json' | 'text' }>([
        {
          type: 'list',
          name: 'exportFormat',
          message: 'Select export format:',
          choices: [
            { name: 'JSON file (.json)', value: 'json' },
            { name: 'Text file (.txt)', value: 'text' },
          ],
        },
      ]);

      // Ask for export location
      const { exportPath } = await inquirer.prompt<{ exportPath: string }>([
        {
          type: 'input',
          name: 'exportPath',
          message: 'Enter export location (press Enter for default):',
          default: '',
        },
      ]);

      // Perform the export
      const spinner = createSpinner();

      try {
        const exportConfig: ExportConfig = {
          format: exportFormat,
          path: exportPath,
          data: exportFormat === 'json' ? allResults : formattedOutput,
        };

        await this.exportService.exportResults(exportConfig, spinner);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error during export: ${errorMessage}`));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error during export process: ${errorMessage}`));
    }
  }
}
