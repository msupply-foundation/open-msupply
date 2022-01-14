import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.openmsupply.client',
  appName: 'openmsupply-client',
  webDir: 'packages/host/dist',
  bundledWebRuntime: false,
};

export default config;
