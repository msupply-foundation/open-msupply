import { describe, expect, it } from 'vitest';
import { definePlugin } from './definePlugin';
import { PLUGIN_API_VERSION } from './apiVersion';

const manifest = {
  code: 'example',
  version: '1.0.0',
  pluginApiVersion: PLUGIN_API_VERSION,
};

describe('definePlugin', () => {
  it('brands the module so the loader can recognise it', () => {
    expect(definePlugin({ manifest }).kind).toBe('oms.plugin');
  });

  it('carries the definition through unchanged', () => {
    const module = definePlugin({
      manifest,
      translations: { en: { greeting: 'Hello' } },
      suppress: ['inventory.stock-levels'],
    });
    expect(module.manifest).toBe(manifest);
    expect(module.translations?.en?.greeting).toBe('Hello');
    expect(module.suppress).toEqual(['inventory.stock-levels']);
  });

  it('freezes the module, so one plugin cannot rewrite another', () => {
    const module = definePlugin({ manifest });
    expect(Object.isFrozen(module)).toBe(true);
  });
});
