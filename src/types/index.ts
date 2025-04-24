/**
 * Type definitions for Digital Forensics File Analysis Tool
 */

/**
 * Interface representing the analysis result from the Python backend
 */
export interface AnalysisResult {
  file_path: string;
  file_name: string;
  size_bytes?: number;
  file_type?: string;
  timestamps?: {
    modified?: string;
    accessed?: string;
    created_or_changed?: string;
  };
  hashes?: {
    md5?: string;
    sha1?: string;
    sha256?: string;
  };
  exif_data?: { [key: string]: string } | { error: string } | null;
  error?: string;
  report_id?: string;
}

/**
 * Command-line options
 */
export interface CliOptions {
  files: string[];
  output?: string;
  viewAll?: boolean;
  log?: boolean;
  check?: string;
}

/**
 * Export configuration for report output
 */
export interface ExportConfig {
  format: 'json' | 'text';
  path: string;
  data: AnalysisResult[] | string;
}

/**
 * Python analyzer configuration
 */
export interface AnalyzerConfig {
  pythonPath: string;
  scriptPath: string;
}

/**
 * Report history item for storing in database
 */
export interface ReportHistoryItem {
  report_id: string;
  timestamp: string;
  analyzed_files: {
    file_name: string;
    file_path: string;
  }[];
  results: AnalysisResult[];
  verification_hash: string;
}

/**
 * File verification result
 */
export interface VerificationResult {
  report_id: string;
  is_authentic: boolean;
  timestamp: string;
  analyzed_files: {
    file_name: string;
    file_path: string;
  }[];
}
