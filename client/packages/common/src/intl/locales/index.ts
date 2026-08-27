// "import type" ensures en messages aren't bundled by default
import { TypeOptions } from 'i18next';
import * as common from './en/common.json';

// Normalize single namespace
type WithOrWithoutPlural<K> = TypeOptions['jsonFormat'] extends 'v4'
  ? K extends unknown
    ? K extends `${infer B}_${
        | 'zero'
        | 'one'
        | 'two'
        | 'few'
        | 'many'
        | 'other'}`
      ? B | K
      : K
    : never
  : K;

export type LocaleKey = WithOrWithoutPlural<keyof typeof common>;
