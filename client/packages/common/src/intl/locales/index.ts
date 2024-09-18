// "import type" ensures en messages aren't bundled by default
import { TypeOptions } from 'i18next';
import * as app from './en/app.json';
import * as common from './en/common.json';
import * as dashboard from './en/dashboard.json';
import * as distribution from './en/distribution.json';
import * as inventory from './en/inventory.json';
import * as replenishment from './en/replenishment.json';
import * as catalogue from './en/catalogue.json';
import * as dispensary from './en/dispensary.json';
import * as programs from './en/programs.json';
import * as coldchain from './en/coldchain.json';
import * as plugin from './en/plugin.json';
import * as manage from './en/manage.json';

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

export type LocaleKey =
  | WithOrWithoutPlural<keyof typeof app>
  | WithOrWithoutPlural<keyof typeof dashboard>
  | WithOrWithoutPlural<keyof typeof common>
  | WithOrWithoutPlural<keyof typeof distribution>
  | WithOrWithoutPlural<keyof typeof replenishment>
  | WithOrWithoutPlural<keyof typeof inventory>
  | WithOrWithoutPlural<keyof typeof catalogue>
  | WithOrWithoutPlural<keyof typeof dispensary>
  | WithOrWithoutPlural<keyof typeof programs>
  | WithOrWithoutPlural<keyof typeof coldchain>
  | WithOrWithoutPlural<keyof typeof plugin>
  | WithOrWithoutPlural<keyof typeof manage>;