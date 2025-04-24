/**
 * Python service - Handles execution of Python analyzer scripts
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { type Ora } from 'ora';
import chalk from 'chalk';

import { AnalysisResult, AnalyzerConfig } from '../types/index.js';
import { PYTHON_SCRIPT_PATH } from '../utils/paths.js';

/**
 * Default configuration for the Python analyzer
 */
const DEFAULT_CONFIG: AnalyzerConfig = {
  pythonPath: 'python3',
  scriptPath: PYTHON_SCRIPT_PATH,
};

/**
 * Service for executing Python analyzer scripts
 */
export class PythonService {
  private config: AnalyzerConfig;

  /**
   * Creates a new PythonService
   *
   * @param config Optional configuration overrides
   */
  constructor(config?: Partial<AnalyzerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Verifies that the Python script exists
   *
   * @param spinner Optional spinner to update with status
   * @returns Promise resolving to true if script exists, false otherwise
   */
  async verifyScriptExists(spinner?: Ora): Promise<boolean> {
    try {
      await fs.access(this.config.scriptPath);
      if (spinner) {
        spinner.text = `Found Python script: ${this.config.scriptPath}`;
      }
      return true;
    } catch {
      if (spinner) {
        spinner.fail(chalk.red(`Python analyzer script not found at: ${this.config.scriptPath}`));
      }
      return false;
    }
  }

  /**
   * Runs the Python analyzer on a specific file
   *
   * @param filePath Path to the file to analyze
   * @param spinner Optional spinner to update with progress
   * @returns Promise resolving to analysis result
   */
  async analyzeFile(filePath: string, spinner?: Ora): Promise<AnalysisResult> {
    const absoluteFilePath = path.resolve(filePath);

    if (spinner) {
      spinner.text = `Analyzing ${chalk.yellow(path.basename(absoluteFilePath))}...`;
    }

    return new Promise<AnalysisResult>(resolve => {
      const process = spawn(this.config.pythonPath, [this.config.scriptPath, absoluteFilePath, '--format', 'json']);

      let stdoutData = '';
      let stderrData = '';

      process.stdout.on('data', data => {
        stdoutData += data.toString();
      });

      process.stderr.on('data', data => {
        stderrData += data.toString();
        if (spinner) {
          // Update spinner with first line of stderr for user feedback
          const firstStderrLine = stderrData.split('\n')[0].trim();
          if (firstStderrLine) {
            spinner.text = `Analyzing ${chalk.yellow(path.basename(absoluteFilePath))}... (${chalk.yellow(firstStderrLine)})`;
          }
        }
      });

      process.on('error', err => {
        if (spinner) {
          spinner.fail(chalk.red(`Failed to start Python script for ${path.basename(absoluteFilePath)}`));
        }
        console.error(chalk.red(`Spawn Error: ${err.message}`));
        console.error(
          chalk.red(
            `Is '${this.config.pythonPath}' installed and in PATH? Is the script path correct ('${this.config.scriptPath}')?`
          )
        );

        // Return error result instead of rejecting to allow processing to continue for other files
        resolve({
          file_path: absoluteFilePath,
          file_name: path.basename(absoluteFilePath),
          error: `Failed to spawn Python process: ${err.message}`,
        });
      });

      process.on('close', code => {
        if (code !== 0) {
          if (spinner) {
            spinner.fail(chalk.red(`Analysis failed for ${path.basename(absoluteFilePath)} (Exit Code: ${code})`));
          }
          console.error(chalk.red(`Python stderr:\n${stderrData || 'No stderr output'}`));

          resolve({
            file_path: absoluteFilePath,
            file_name: path.basename(absoluteFilePath),
            error: `Python script exited with code ${code}. Stderr: ${stderrData.trim() || 'None'}`,
          });
        } else {
          try {
            if (!stdoutData.trim()) {
              throw new Error('Python script produced no JSON output.');
            }

            const resultsArray = JSON.parse(stdoutData) as AnalysisResult[];

            if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
              throw new Error('Python script output was not a valid non-empty JSON array.');
            }

            if (spinner) {
              spinner.succeed(chalk.green(`Analysis complete for ${path.basename(absoluteFilePath)}`));
            }

            resolve(resultsArray[0]);
          } catch (error) {
            if (spinner) {
              spinner.fail(chalk.red(`Failed to parse Python output for ${path.basename(absoluteFilePath)}`));
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`JSON Parse Error: ${errorMessage}`));

            resolve({
              file_path: absoluteFilePath,
              file_name: path.basename(absoluteFilePath),
              error: `Failed to parse JSON output from Python script. Error: ${errorMessage}`,
            });
          }
        }
      });
    });
  }
}
