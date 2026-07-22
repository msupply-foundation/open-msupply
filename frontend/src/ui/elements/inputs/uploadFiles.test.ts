import { describe, expect, it } from 'vitest';
import { partitionFiles, type FileLike } from './uploadFiles';

const file = (name: string, type: string, size: number): FileLike => ({
  name,
  type,
  size,
});

describe('partitionFiles', () => {
  it('accepts everything when no accept list is given', () => {
    const files = [file('a.pdf', 'application/pdf', 10), file('b.xyz', '', 10)];
    const { accepted, rejected } = partitionFiles(files);
    expect(accepted).toHaveLength(2);
    expect(rejected).toHaveLength(0);
  });

  it('matches by extension', () => {
    const { accepted, rejected } = partitionFiles(
      [file('report.PDF', '', 10), file('note.txt', '', 10)],
      { accept: '.pdf,.docx' }
    );
    expect(accepted.map(f => f.name)).toEqual(['report.PDF']);
    expect(rejected).toEqual([
      { file: file('note.txt', '', 10), reason: 'type' },
    ]);
  });

  it('matches by exact MIME type when the extension is unknown', () => {
    // e.g. a .jfif photo reported as image/jpeg.
    const { accepted } = partitionFiles(
      [file('photo.jfif', 'image/jpeg', 10)],
      {
        accept: '.jpg,image/jpeg',
      }
    );
    expect(accepted).toHaveLength(1);
  });

  it('matches MIME wildcards', () => {
    const { accepted, rejected } = partitionFiles(
      [file('a.png', 'image/png', 10), file('b.pdf', 'application/pdf', 10)],
      { accept: 'image/*' }
    );
    expect(accepted.map(f => f.name)).toEqual(['a.png']);
    expect(rejected.map(r => r.file.name)).toEqual(['b.pdf']);
  });

  it('rejects oversized files as size, and checks type before size', () => {
    const { accepted, rejected } = partitionFiles(
      [
        file('ok.pdf', 'application/pdf', 100),
        file('big.pdf', 'application/pdf', 5000),
        file('big.exe', 'application/x-msdownload', 5000),
      ],
      { accept: '.pdf', maxSize: 1000 }
    );
    expect(accepted.map(f => f.name)).toEqual(['ok.pdf']);
    expect(rejected).toEqual([
      { file: file('big.pdf', 'application/pdf', 5000), reason: 'size' },
      {
        file: file('big.exe', 'application/x-msdownload', 5000),
        reason: 'type',
      },
    ]);
  });
});
