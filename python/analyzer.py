"""
analyzer.py
Digital Forensics File Analysis Tool - Backend Processor
Analyzes file metadata, hashes, and EXIF data, providing results in JSON format
Designed to be called as a subprocess from the Node.js frontend
"""

import os
import hashlib
import argparse
import json
import datetime
import sys

try:
    import magic
except ImportError:
    magic = None

try:
    import exifread
except ImportError:
    exifread = None


def calculate_hashes(filepath: str) -> dict[str, str]:
    """
    Calculates standard cryptographic hashes (MD5, SHA1, SHA256) for a given file.

    Args:
        filepath: Absolute path to the file.

    Returns:
        A dictionary containing hash algorithm names as keys and hex digests as values.
        Returns 'Error' as value if hashing fails for any reason.
    """
    hashes = {"md5": hashlib.md5(), "sha1": hashlib.sha1(), "sha256": hashlib.sha256()}
    buffer_size = 8192  
    
    try:
        with open(filepath, 'rb') as f:
            while chunk := f.read(buffer_size):
                for algo in hashes.values():
                    algo.update(chunk)
        return {name: algo.hexdigest() for name, algo in hashes.items()}
    except OSError as e:
        print(f"Error hashing file '{os.path.basename(filepath)}': {e}", file=sys.stderr)
        return {name: "Error: Hashing failed" for name in hashes}
    except Exception as e:
        print(f"Unexpected error hashing file '{os.path.basename(filepath)}': {e}", file=sys.stderr)
        return {name: "Error: Hashing failed" for name in hashes}


def get_file_type(filepath: str) -> str:
    """
    Identifies the file type using libmagic via the python-magic library.

    Args:
        filepath: Absolute path to the file.

    Returns:
        A string describing the file type (MIME type and description),
        or an error/warning message if detection fails or libmagic is missing.
    """
    if not magic:
        return "Detection Skipped (python-magic not installed)"

    try:
        mime_type = magic.from_file(filepath, mime=True)
        description = magic.from_file(filepath)
        return f"{mime_type} ({description})"
    except magic.MagicException as e:
        if "failed to find libmagic" in str(e).lower():
             print(f"Warning: libmagic library not found or configured correctly. File type detection skipped for {os.path.basename(filepath)}.", file=sys.stderr)
             return "Detection Skipped (libmagic missing/misconfigured)"
        else:
            print(f"Error detecting file type for '{os.path.basename(filepath)}': {e}", file=sys.stderr)
            return "Error: Type detection failed"
    except Exception as e:
        print(f"Unexpected error detecting file type for '{os.path.basename(filepath)}': {e}", file=sys.stderr)
        return "Error: Type detection failed"


def get_timestamps(filepath: str) -> dict[str, str]:
    """
    Retrieves file system timestamps (Modified, Accessed, Created/Changed).

    Args:
        filepath: Absolute path to the file.

    Returns:
        A dictionary mapping timestamp types ('modified', 'accessed', 'created_or_changed')
        to their ISO 8601 formatted string representations, or 'Error' on failure.
        Note: 'created_or_changed' corresponds to st_ctime, which has platform-specific meaning.
    """
    try:
        stat_result = os.stat(filepath)
        return {
            "modified": datetime.datetime.fromtimestamp(stat_result.st_mtime).isoformat(),
            "accessed": datetime.datetime.fromtimestamp(stat_result.st_atime).isoformat(),
            "created_or_changed": datetime.datetime.fromtimestamp(stat_result.st_ctime).isoformat(),
        }
    except OSError as e:
        print(f"Error getting timestamps for '{os.path.basename(filepath)}': {e}", file=sys.stderr)
        return {"modified": "Error", "accessed": "Error", "created_or_changed": "Error"}
    except Exception as e:
        print(f"Unexpected error getting timestamps for '{os.path.basename(filepath)}': {e}", file=sys.stderr)
        return {"modified": "Error", "accessed": "Error", "created_or_changed": "Error"}


def get_exif_data(filepath: str) -> dict[str, str] | None:
    """
    Extracts EXIF metadata from JPEG or TIFF files using ExifRead.

    Args:
        filepath: Absolute path to the file.

    Returns:
        A dictionary of EXIF tag names to their printable string values if EXIF data is found.
        Returns None if the file is not a supported image type or has no EXIF data.
        Returns a dictionary with an 'error' key if processing fails on a likely image file.
    """
    if not exifread:
        return None

    # Pre-check file type to avoid processing non-image files
    try:
        if magic:
            mime = magic.from_file(filepath, mime=True).lower()
            if not ('jpeg' in mime or 'tiff' in mime):
                return None
    except Exception:
        pass  # Continue with EXIF extraction attempt

    exif_data = {}
    try:
        with open(filepath, 'rb') as f:
            tags = exifread.process_file(f, stop_tag='UNDEF', details=True)

            if not tags:
                return None

            for tag, value_obj in tags.items():
                # Skip binary blobs and other problematic tags
                if tag not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote', 'InteroperabilityThumbnail', 'Padding'):
                    try:
                        printable_value = value_obj.printable
                        # Truncate long values for readability
                        max_len = 150
                        if len(printable_value) > max_len:
                            printable_value = printable_value[:max_len] + "..."
                        exif_data[str(tag)] = printable_value
                    except Exception:
                        exif_data[str(tag)] = "[Value Decode Error]"

            return exif_data if exif_data else None
    except FileNotFoundError:
        print(f"Error reading EXIF for '{os.path.basename(filepath)}': File not found at read time.", file=sys.stderr)
        return {"error": "File not found during EXIF read"}
    except Exception as e:
        print(f"Error processing EXIF for '{os.path.basename(filepath)}': {e}", file=sys.stderr)
        return {"error": f"Could not process EXIF - {type(e).__name__}"}


def analyze_file(filepath: str) -> dict | None:
    """
    Orchestrates the analysis of a single file by calling individual functions.

    Args:
        filepath: Path to the file provided by the user/calling process.

    Returns:
        A dictionary containing the consolidated analysis results for the file,
        or a dictionary containing only error information if analysis fails critically.
        Returns None only if the initial path validation fails (e.g., path doesn't exist).
    """
    # Resolve to absolute path for consistency
    abs_filepath = os.path.abspath(filepath)

    # Input validation
    if not os.path.exists(abs_filepath):
        print(f"Error: File path does not exist: {abs_filepath}", file=sys.stderr)
        return {
            "file_path": abs_filepath,
            "file_name": os.path.basename(filepath),
            "error": "File not found"
        }
    if not os.path.isfile(abs_filepath):
        print(f"Error: Path is not a file: {abs_filepath}", file=sys.stderr)
        return {
            "file_path": abs_filepath,
            "file_name": os.path.basename(filepath),
            "error": "Path is not a file"
        }

    # Perform analysis
    file_info = {
        "file_path": abs_filepath,
        "file_name": os.path.basename(abs_filepath),
    }

    try:
        file_info["size_bytes"] = os.path.getsize(abs_filepath)
    except OSError as e:
        print(f"Error getting size for '{file_info['file_name']}': {e}", file=sys.stderr)
        file_info["size_bytes"] = "Error"

    file_info["file_type"] = get_file_type(abs_filepath)
    file_info["timestamps"] = get_timestamps(abs_filepath)
    file_info["hashes"] = calculate_hashes(abs_filepath)

    # Only add EXIF data if applicable and successfully retrieved
    exif_result = get_exif_data(abs_filepath)
    if exif_result is not None:
        file_info["exif_data"] = exif_result

    return file_info


if __name__ == "__main__":
    # Setup argument parser for command-line usage
    parser = argparse.ArgumentParser(description="File Metadata and Hash Analyzer (JSON Output)")
    parser.add_argument("files", metavar="FILE", type=str, nargs='+',
                        help="Path(s) to the file(s) to analyze")
    parser.add_argument("--format", type=str, choices=['json'], default='json',
                        help="Output format (only json supported for subprocess use)")

    args = parser.parse_args()

    if args.format != 'json':
        print("Error: This script currently only supports --format json for subprocess usage.", file=sys.stderr)
        sys.exit(1)

    all_results = []
    for filepath in args.files:
        analysis_result = analyze_file(filepath)
        if analysis_result:
            all_results.append(analysis_result)

    # Output results as JSON to stdout for the Node.js wrapper to capture
    try:
        json_output = json.dumps(all_results, indent=None)
        print(json_output)
    except TypeError as e:
        print(f"Error serializing results to JSON: {e}", file=sys.stderr)
        print(json.dumps([{"error": "Failed to serialize results to JSON"}]))
        sys.exit(1)

    sys.exit(0)