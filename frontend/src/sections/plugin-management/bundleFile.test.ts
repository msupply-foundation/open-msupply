import { describe, expect, it } from 'vitest';
import { chooseOne, partitionFiles } from '@/ui/elements/inputs/uploadFiles';
import { BUNDLE_ACCEPT } from './bundleFile';
import { MAX_UPLOAD_BYTES } from '@/api/postFiles';

// spec/plugin-management/cases/OMS-REG-MNG-07 — installing (the file choice).
// The upload route's cases are api/postFiles.test.ts's.

const fileLike = (name: string, size = 10) => ({
  name,
  type: name.endsWith('.json') ? 'application/json' : 'text/plain',
  size,
});

// What one pick or drop decides: the upload zone's partition, then the choice.
const choose = (...files: ReturnType<typeof fileLike>[]) => {
  const { accepted, rejected } = partitionFiles(files, {
    accept: BUNDLE_ACCEPT,
    maxSize: MAX_UPLOAD_BYTES,
  });
  return chooseOne(accepted, rejected);
};

describe('OMS-REG-MNG-07.22 — a file not named .json is refused', () => {
  it('refuses it as an invalid type', () => {
    const choice = choose(fileLike('plugin.txt'));
    expect(choice.kind).toBe('refused');
    expect(choice.kind === 'refused' && choice.rejection.reason).toBe('type');
  });
});

describe('OMS-REG-MNG-07.24 — .json in any letter case is accepted', () => {
  it('chooses BUNDLE.JSON', () => {
    const choice = choose({ name: 'BUNDLE.JSON', type: '', size: 10 });
    expect(choice.kind).toBe('chosen');
  });
});

describe('OMS-REG-MNG-07.37 — a file over 50 MB is refused before sending', () => {
  it('refuses 50 MB + 1 byte as too large, and chooses 50 MB exactly', () => {
    const over = choose(fileLike('big.json', MAX_UPLOAD_BYTES + 1));
    expect(over.kind === 'refused' && over.rejection.reason).toBe('size');
    expect(choose(fileLike('edge.json', MAX_UPLOAD_BYTES)).kind).toBe('chosen');
  });
});

describe('OMS-REG-MNG-07.38 — a drop of several files chooses none', () => {
  it('chooses none for two bundles', () => {
    expect(choose(fileLike('a.json'), fileLike('b.json')).kind).toBe('none');
  });

  it('chooses none for a bundle beside a refused file, and says nothing', () => {
    expect(choose(fileLike('a.json'), fileLike('x.txt')).kind).toBe('none');
  });
});
