/**
 * Utility functions for hash generation and verification
 */
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

/**
 * Creates a custom hash for report verification
 * Uses a combination of SHA-256 and bcrypt for enhanced security
 *
 * @param content Content to hash
 * @returns Custom verification hash
 */
export function createVerificationHash(content: string): string {
  // First use SHA-256 to create a fixed-length hash
  const sha256Hash = crypto.createHash('sha256').update(content).digest('hex');

  // Then use bcrypt to add salting and protection
  // We use a low saltRounds (5) to keep performance reasonable since this is only for verification
  const saltRounds = 5;
  const bcryptHash = bcryptjs.hashSync(sha256Hash, saltRounds);

  // Return a custom format that combines both methods
  return `dfv1:${bcryptHash}`;
}

/**
 * Verifies a content against a verification hash
 *
 * @param content Content to verify
 * @param verificationHash Hash to verify against
 * @returns True if content matches the hash
 */
export function verifyContent(content: string, verificationHash: string): boolean {
  try {
    // Check if the hash has our custom format
    if (!verificationHash.startsWith('dfv1:')) {
      throw new Error('Invalid verification hash format');
    }

    // Extract the bcrypt hash
    const bcryptHash = verificationHash.substring(5);

    // Create SHA-256 hash of the content
    const contentSha256 = crypto.createHash('sha256').update(content).digest('hex');

    // Compare with bcrypt
    return bcryptjs.compareSync(contentSha256, bcryptHash);
  } catch (error) {
    console.error(`Verification error: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

/**
 * Creates a report content string for hashing
 * Ensures we're only hashing the important data for verification
 *
 * @param result Analysis result to hash
 * @returns String representation for hashing
 */
export function createReportContentForHashing(result: any): string {
  // Create a copy to avoid modifying the original
  const contentToHash = { ...result };

  // Remove verification metadata from the hash content
  if (contentToHash.report_id) {
    delete contentToHash.report_id;
  }

  return JSON.stringify(contentToHash);
}
