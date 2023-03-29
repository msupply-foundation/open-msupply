import { Capacitor, registerPlugin } from '@capacitor/core';
import { FrontEndHost, NativeMode, NativeAPI } from './types';

export const setPreference = async (
  key: string,
  value: NativeMode | FrontEndHost
) => {
  const nativeAPI = getNativeAPI();
  nativeAPI?.setPreference({ key, value: JSON.stringify(value) });
};

export const getPreference = async (key: string, defaultValue?: string) => {
  const nativeAPI = getNativeAPI();
  const preference = await nativeAPI?.getPreference({
    key,
    value: defaultValue ?? '',
  });

  const value = preference?.value ?? defaultValue;
  return value ? JSON.parse(value) : '';
};

const androidNativeAPI = registerPlugin<NativeAPI>('NativeApi');

export const getNativeAPI = (): NativeAPI | null => {
  // Android
  if (Capacitor.isNativePlatform()) return androidNativeAPI;

  // Electron
  if (!!window.electronNativeAPI) return window.electronNativeAPI;

  return null;
};

export const frontEndHostUrl = ({ protocol, ip, port }: FrontEndHost) =>
  `${protocol}://${ip}:${port}`;

export const frontEndHostDiscoveryGraphql = (server: FrontEndHost) =>
  `${frontEndHostUrl({
    ...server,
    port: server.port + 1,
    protocol: 'http',
  })}/graphql`;

export const frontEndHostDisplay = ({ protocol, ip, port }: FrontEndHost) => {
  switch (protocol) {
    case 'https':
      return port === 443 ? `https://${ip}` : `https://${ip}:${port}`;
    default:
      return port === 80 ? `http://${ip}` : `http://${ip}:${port}`;
  }
};

export const matchUniqueServer = (a: FrontEndHost, b: FrontEndHost) =>
  // Allow port to run multiple instances on one machine (at least for dev)
  a.hardwareId === b.hardwareId && a.port === b.port;
