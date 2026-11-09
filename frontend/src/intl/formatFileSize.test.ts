import { describe, expect, it } from 'vitest';
import { formatFileSize } from './formatFileSize';

// Mirrors the current app's Formatter.fileSize test vectors so the two apps
// stay in lock-step.
describe('formatFileSize', () => {
  it('renders empty for absent/negative sizes', () => {
    expect(formatFileSize(null)).toBe('');
    expect(formatFileSize(undefined)).toBe('');
    expect(formatFileSize(-1)).toBe('');
  });

  it('renders bytes under 1 KiB', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(999)).toBe('999 B');
  });

  it('renders whole KB', () => {
    expect(formatFileSize(2048)).toBe('2 KB');
  });

  it('renders one-decimal MB and GB', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
    expect(formatFileSize(52428800)).toBe('50.0 MB');
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
});
