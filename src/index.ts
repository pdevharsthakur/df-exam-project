/**
 * Digital Forensics File Analysis Tool - Main Entry Point
 *
 * A tool for analyzing files for forensic investigation, including:
 * - File metadata (size, timestamps)
 * - Cryptographic hashes (MD5, SHA1, SHA256)
 * - File type detection
 * - EXIF metadata extraction (for images)
 */

import { CommandHandler } from './cli/commands.js';

/**
 * Main application entry point
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
