// "import type" ensures en messages aren't bundled by default
import * as app from './en/app.json';
import * as common from './en/common.json';
import * as dashboard from './en/dashboard.json';
import * as distribution from './en/distribution.json';

export type LocaleKey =
  | keyof typeof app
  | keyof typeof dashboard
  | keyof typeof common
  | keyof typeof distribution;
