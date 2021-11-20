// "import type" ensures en messages aren't bundled by default
import app from './en/app.json';
import common from './en/common.json';
import dashboard from './en/dashboard.json';
import outboundShipment from './en/outbound-shipment.json';

export type LocaleKey =
  | keyof typeof app
  | keyof typeof dashboard
  | keyof typeof common
  | keyof typeof outboundShipment;

export const resources = {
  en: {
    app,
    dashboard,
    common,
    'outbound-shipment': outboundShipment,
  },
} as const;
