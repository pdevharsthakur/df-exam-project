/**
 * Report formatter for Digital Forensics File Analysis Tool
 */
import chalk from 'chalk';
import Table from 'cli-table3';
import { AnalysisResult } from '../types/index.js';

// Define proper types for EXIF data
interface ExifData {
  [key: string]: string;
}

// Type for detailed metadata extraction
interface FileDetailsObject {
  Format?: string;
  Resolution?: string;
  Manufacturer?: string;
  Model?: string;
  Software?: string;
  [key: string]: string | undefined;
}

/**
 * Creates a clean header for the report
 *
 * @param text The text to display in the header
 * @returns Formatted header string
 */
function createHeader(text: string): string {
  return `\n${chalk.bold.white('┏' + '━'.repeat(78) + '┓')}
${chalk.bold.white('┃')}  ${chalk.bold.blue(text)}${' '.repeat(76 - text.length)}${chalk.bold.white('┃')}
${chalk.bold.white('┗' + '━'.repeat(78) + '┛')}\n`;
}

/**
 * Formats the analysis results into a human-readable report
 *
 * @param results Array of file analysis results
 * @param viewAll Whether to display all metadata tags (true) or just important ones (false)
 * @returns Formatted string containing the complete report
 */
export function formatResults(results: AnalysisResult[], viewAll = false): string {
  let output = '';

  // Add report header
  output += createHeader('🔍 DIGITAL FORENSIC ANALYSIS REPORT');
  output += `${chalk.dim('Generated: ')}${chalk.white(new Date().toLocaleString())}\n`;

  // Add report ID if available
  if (results.length > 0 && results[0].report_id) {
    output += `${chalk.dim('Report ID: ')}${chalk.white(results[0].report_id)}\n`;
  }

  output += '\n';

  // Define common table style with modern, clean borders
  const tableOptions = {
    chars: {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    },
    style: {
      head: ['white', 'bold'],
      border: ['gray'],
      compact: true,
    },
    colWidths: [22, 58],
    wordWrap: true,
  };

  results.forEach(result => {
    output += chalk.white(`\n${'─'.repeat(80)}\n`);
    output += chalk.bold.white(`\n📄 FILE ANALYSIS: ${result.file_name}\n`);

    if (result.error) {
      output += chalk.red.bold(`⚠️ Error: ${result.error}\n\n`);
      return;
    }

    // Basic Info Table
    const basicTable = new Table({
      ...tableOptions,
      head: [chalk.bold.white('Property'), chalk.bold.white('Value')],
    });

    // Format file size to be more readable
    const sizeBytes = result.size_bytes ?? 0;
    let sizeStr: string;
    if (sizeBytes > 1024 * 1024) {
      sizeStr = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB (${sizeBytes} bytes)`;
    } else if (sizeBytes > 1024) {
      sizeStr = `${(sizeBytes / 1024).toFixed(2)} KB (${sizeBytes} bytes)`;
    } else {
      sizeStr = `${sizeBytes} bytes`;
    }

    // Extract the basic MIME type from the full file type description
    const fileType = result.file_type ?? 'N/A';
    const mimeType = fileType.split(' ')[0];

    basicTable.push(
      [chalk.blue('File Name'), chalk.white(result.file_name)],
      [chalk.blue('Size'), chalk.white(sizeStr)],
      [chalk.blue('MIME Type'), chalk.white(mimeType)]
    );

    // Add timestamps in a forensically relevant format
    if (result.timestamps) {
      basicTable.push(
        [chalk.blue('Modified'), chalk.white(result.timestamps.modified?.replace('T', ' ').substring(0, 19) ?? 'N/A')],
        [chalk.blue('Accessed'), chalk.white(result.timestamps.accessed?.replace('T', ' ').substring(0, 19) ?? 'N/A')],
        [
          chalk.blue('Created/Changed'),
          chalk.white(result.timestamps.created_or_changed?.replace('T', ' ').substring(0, 19) ?? 'N/A'),
        ]
      );
    }

    output += basicTable.toString() + '\n';

    // File Type Details section
    if (result.file_type) {
      output += chalk.bold.blue(`\n🔎 FILE TYPE ANALYSIS:\n`);
      const typeDetails = result.file_type;

      // Create a table for file type details
      const typeTable = new Table({
        ...tableOptions,
        colWidths: [22, 58],
        wordWrap: true,
      });

      // Extract MIME type
      const mimeType = typeDetails.split(' ')[0];

      // Extract detailed information from parentheses
      const detailsMatch = typeDetails.match(/\((.*)\)/);
      let fileDetails = detailsMatch ? detailsMatch[1] : '';

      // Parse specific forensically relevant details from the file type string
      const detailsObject: FileDetailsObject = {};

      if (fileDetails) {
        // Extract format details
        detailsObject.Format = fileDetails.split(',')[0];

        // Try to extract resolution if present
        const resolutionMatch = fileDetails.match(/(\d+)x(\d+)/);
        if (resolutionMatch) {
          detailsObject.Resolution = `${resolutionMatch[0]} pixels`;
        }

        // Extract manufacturer if present
        const manufacturerMatch = fileDetails.match(/manufacturer=([^,]+)/);
        if (manufacturerMatch) {
          detailsObject.Manufacturer = manufacturerMatch[1];
        }

        // Extract model if present
        const modelMatch = fileDetails.match(/model=([^,]+)/);
        if (modelMatch) {
          detailsObject.Model = modelMatch[1];
        }

        // Extract software if present
        const softwareMatch = fileDetails.match(/software=([^,]+)/);
        if (softwareMatch) {
          detailsObject.Software = softwareMatch[1];
        }
      }

      // Add the MIME type to the table
      typeTable.push([chalk.blue('MIME Type'), chalk.white(mimeType)]);

      // Add the extracted details to the table
      Object.entries(detailsObject).forEach(([key, value]) => {
        if (value) {
          typeTable.push([chalk.blue(key), chalk.white(value)]);
        }
      });

      // Add the full details (truncated) as the last row
      if (fileDetails) {
        typeTable.push([
          chalk.blue('Full Description'),
          chalk.white(fileDetails.length > 55 ? fileDetails.substring(0, 55) + '...' : fileDetails),
        ]);
      }

      output += typeTable.toString() + '\n';
    }

    // Cryptographic hash verification section
    if (result.hashes) {
      const hashTable = new Table({
        ...tableOptions,
        head: [chalk.bold.white('Hash Type'), chalk.bold.white('Value')],
      });

      hashTable.push(
        [chalk.blue('MD5'), chalk.white(result.hashes.md5 ?? 'N/A')],
        [chalk.blue('SHA1'), chalk.white(result.hashes.sha1 ?? 'N/A')],
        [chalk.blue('SHA256'), chalk.white(result.hashes.sha256 ?? 'N/A')]
      );

      output += chalk.bold.blue(`\n🔐 VERIFICATION HASHES:\n`);
      output += hashTable.toString() + '\n';
    }

    // Metadata analysis section
    if (result.exif_data) {
      output += chalk.bold.blue(`\n📊 METADATA ANALYSIS:\n`);

      if (typeof result.exif_data === 'object' && 'error' in result.exif_data) {
        output += chalk.yellow(`⚠️ Error processing EXIF: ${result.exif_data.error}\n`);
      } else if (typeof result.exif_data === 'object' && result.exif_data !== null) {
        // Define forensically relevant metadata tags to prioritize
        const relevantTags = [
          'EXIF DateTimeOriginal',
          'EXIF DateTimeDigitized',
          'Image DateTime',
          'Image Make',
          'Image Model',
          'EXIF ExifImageWidth',
          'EXIF ExifImageLength',
          'EXIF GPSLatitude',
          'EXIF GPSLongitude',
          'EXIF GPSDateStamp',
          'EXIF GPSTimeStamp',
          'EXIF Software',
          'Image HostComputer',
        ];

        const exifData = result.exif_data as ExifData;
        const exifEntries = Object.entries(exifData);

        if (exifEntries.length > 0) {
          // First table with forensically important tags
          const importantExifTable = new Table({
            ...tableOptions,
            head: [chalk.bold.white('📅 Important Metadata'), chalk.bold.white('Value')],
          });

          let hasImportantTags = false;

          // Add important tags first
          relevantTags.forEach(tag => {
            const entry = exifEntries.find(([key]) => key === tag);
            if (entry) {
              hasImportantTags = true;
              importantExifTable.push([chalk.blue(entry[0]), chalk.white(String(entry[1]))]);
            }
          });

          if (hasImportantTags) {
            output += importantExifTable.toString() + '\n';
          }

          // Show all EXIF tags if viewAll is enabled
          if (viewAll) {
            // Show all remaining EXIF tags in one table
            const allExifTable = new Table({
              ...tableOptions,
              head: [chalk.bold.white('📋 All Metadata Tags'), chalk.bold.white('Value')],
            });

            exifEntries.forEach(([key, value]) => {
              if (!relevantTags.includes(key) || !hasImportantTags) {
                // Truncate long values
                const displayValue = String(value).length > 55 ? String(value).substring(0, 55) + '...' : String(value);

                allExifTable.push([chalk.blue(key), chalk.white(displayValue)]);
              }
            });

            output += '\n' + allExifTable.toString() + '\n';
          } else {
            // Show just a limited number of other EXIF tags
            const otherExifTable = new Table({
              ...tableOptions,
              head: [chalk.bold.white('📋 Other Metadata'), chalk.bold.white('Value')],
            });

            let otherTagCount = 0;
            const otherTagLimit = 10; // Reduce limit for cleaner output

            exifEntries.forEach(([key, value]) => {
              if (!relevantTags.includes(key) && otherTagCount < otherTagLimit) {
                otherTagCount++;

                // Truncate long values
                const displayValue = String(value).length > 55 ? String(value).substring(0, 55) + '...' : String(value);

                otherExifTable.push([chalk.blue(key), chalk.white(displayValue)]);
              }
            });

            if (otherTagCount > 0) {
              output += '\n' + otherExifTable.toString() + '\n';
              if (exifEntries.length - relevantTags.length > otherTagLimit) {
                output += chalk.dim(
                  `\n...and ${exifEntries.length - relevantTags.length - otherTagCount} more metadata tags (use --view-all to see all)\n`
                );
              }
            }
          }
        } else {
          output += chalk.italic('  No metadata tags found.\n');
        }
      }
    } else if (result.file_type?.toLowerCase().includes('image')) {
      output += chalk.bold.blue(`\n📊 METADATA ANALYSIS:\n`);
      output += chalk.italic('  No metadata present or readable.\n');
    }

    // Show file path at the end for reference
    output += chalk.dim(`\n📁 Full Path: ${result.file_path}\n`);

    // Add a footer separator
    output += chalk.white(`\n${'─'.repeat(80)}\n`);
  });

  return output;
}
