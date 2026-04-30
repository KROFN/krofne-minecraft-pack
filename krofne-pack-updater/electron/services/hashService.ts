import crypto from 'crypto';
import fs from 'fs';

/**
 * Compute SHA-512 hash of a file using streaming approach.
 * Suitable for large files as it doesn't load the entire file into memory.
 */
export async function computeFileSha512(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data: string | Buffer) => {
      hash.update(data as Buffer);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (err: Error) => {
      reject(err);
    });
  });
}
