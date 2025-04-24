/**
 * @file Digital Forensics File Analysis Tool - Main Entry Point
 * @description 
 * This is the primary entry point for the Digital Forensics File Analysis Tool.
 * It initializes the command-line interface and handles the main application flow.
 * 
 * This tool performs comprehensive analysis of files for forensic investigation, including:
 * - File metadata extraction (size, timestamps)
 * - Cryptographic hash generation (MD5, SHA1, SHA256) for file verification
 * - File type detection and verification
 * - EXIF metadata extraction for images
 * - Report generation and history management
 * 
 * @module Main
 */

import { CommandHandler } from './cli/commands.js';

/**
 * Main application entry point that initializes and runs the command handler
 * with arguments provided from the command line
 */
async function main() {
  const commandHandler = new CommandHandler();
  const options = commandHandler.parseArguments(process.argv);

  await commandHandler.run(options);
}

// Run main function and handle any uncaught errors
main().catch(error => {
  console.error('\nFatal error: Application terminated unexpectedly.');
  console.error(error);
  process.exit(1);
});
