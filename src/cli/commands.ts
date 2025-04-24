/**
 * Command handlers for CLI operations
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';

import { CliOptions, AnalysisResult } from '../types/index.js';
import { PythonService } from '../services/python-service.js';
import { formatResults } from '../core/formatter.js';
import { PromptHandler } from './prompt.js';
import { writeFile } from '../utils/fs-utils.js';
import { ReportHistoryService } from '../services/report-history-service.js';

/**
 * Command handler for the CLI
 */
export class CommandHandler {
  private program: Command;
  private pythonService: PythonService;
  private promptHandler: PromptHandler;
  private reportHistoryService: ReportHistoryService;

  constructor() {
    this.program = new Command();
    this.pythonService = new PythonService();
    this.promptHandler = new PromptHandler();
    this.reportHistoryService = new ReportHistoryService();

    this.setupCommands();
  }

  /**
   * Sets up the CLI commands
   */
  private setupCommands(): void {
    this.program
      .version('1.0.0')
      .description('Digital Forensics File Analysis Tool')
      .option('-f, --files <filePaths...>', 'Paths to the files to analyze')
      .option('-o, --output <outputFile>', 'Save the formatted report to a file')
      .option('--view-all', 'Show all metadata tags in the detailed output')
      .option('--log', 'View history of past analysis reports')
      .option('--check <reportFile>', 'Verify the authenticity of a report file');
  }

  /**
   * Parses command line arguments
   *
   * @param argv Command line arguments
   * @returns Parsed options
   */
  parseArguments(argv: string[]): CliOptions {
    this.program.parse(argv);
    return this.program.opts<CliOptions>();
  }

  /**
   * Runs the analysis based on CLI options
   *
   * @param options CLI options
   * @returns Promise that resolves when analysis is complete
   */
  async run(options: CliOptions): Promise<void> {
    const spinner = ora({ text: 'Initializing...', spinner: 'dots' }).start();

    try {
      // Handle report verification if --check is specified
      if (options.check) {
        spinner.text = 'Verifying report authenticity...';

        const reportFilePath = path.resolve(options.check);
        const verificationResult = await this.reportHistoryService.verifyReportFile(reportFilePath);

        spinner.stop();

        if (verificationResult) {
          const verificationOutput = this.reportHistoryService.formatVerificationResult(verificationResult);
          console.log(verificationOutput);
        } else {
          console.log(chalk.red('\n❌ ERROR: Could not verify the report. See error message above.\n'));
        }
        return;
      }

      // Handle log view request
      if (options.log) {
        spinner.text = 'Loading report history...';
        const history = await this.reportHistoryService.getReportHistory();
        spinner.stop();

        const formattedHistory = this.reportHistoryService.formatReportHistory(history);
        console.log(formattedHistory);
        return;
      }

      // Ensure files are provided when not in log mode
      if (!options.files || options.files.length === 0) {
        spinner.fail(chalk.red('No files specified for analysis.'));
        console.log(chalk.yellow('Use --files <filePaths...> to specify files to analyze'));
        console.log(chalk.yellow('Or use --log to view report history'));
        console.log(chalk.yellow('Or use --check <reportFile> to verify a report'));
        return;
      }

      // Check if Python script exists
      const scriptExists = await this.pythonService.verifyScriptExists(spinner);
      if (!scriptExists) {
        console.error(chalk.red('Please ensure analyzer.py is in the python/ directory relative to the project root.'));
        process.exit(1);
      }

      // Short pause for readability
      await new Promise(resolve => setTimeout(resolve, 50));

      spinner.text = 'Starting file analysis...';

      const allResults: AnalysisResult[] = [];

      // Process each file
      for (const filePath of options.files) {
        const absoluteFilePath = path.resolve(filePath);

        try {
          // Check file access before analyzing
          await fs.access(absoluteFilePath);
          const result = await this.pythonService.analyzeFile(absoluteFilePath, spinner);
          allResults.push(result);
        } catch (error) {
          spinner.fail(chalk.red(`File not accessible: ${absoluteFilePath}`));
          const errorMessage = error instanceof Error ? error.message : String(error);
          allResults.push({
            file_path: absoluteFilePath,
            file_name: path.basename(absoluteFilePath),
            error: `File not found or inaccessible. Error: ${errorMessage}`,
          });
          spinner.text = 'Continuing analysis...';
        }
      }

      if (allResults.length > 0) {
        // Generate a report ID and save to history
        spinner.text = 'Saving report to history...';
        const reportId = await this.reportHistoryService.saveReport(allResults);
        spinner.stop();

        const formattedOutput = formatResults(allResults, options.viewAll);

        // Handle output file if specified
        if (options.output) {
          const outputFilePath = path.resolve(options.output);
          spinner.start(`Saving report to ${outputFilePath}...`);

          try {
            await writeFile(outputFilePath, formattedOutput);
            spinner.succeed(chalk.bold.green(`Report saved successfully!`));

            // Display verification tip
            console.log(chalk.dim(`\nTip: You can verify this report later using:`));
            console.log(chalk.dim(`  pnpm start --check ${outputFilePath}\n`));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            spinner.fail(chalk.red(`Error saving report: ${errorMessage}`));
            console.log('\nDisplaying results in console instead:\n');
            console.log(formattedOutput);
          }
        } else {
          // Display in console
          console.log(formattedOutput);
        }

        // Prompt for export
        await this.promptHandler.handleExportPrompt(allResults, formattedOutput, () =>
          ora({ text: 'Exporting...', spinner: 'dots' }).start()
        );
      } else {
        spinner.stop();
        console.log(chalk.yellow('No files were provided or processed.'));
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red.bold('\nAn unexpected critical error occurred:'));
      console.error(error instanceof Error ? error.stack : error);
      process.exit(1);
    }
  }
}
