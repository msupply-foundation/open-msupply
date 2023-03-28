import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import {
  FrontEndHost,
  NativeMode,
  NATIVE_MODE_KEY,
  PREVIOUS_SERVER_KEY,
  NativeAPI,
} from './types';

export const getStorageKey = (key: string) => {
  switch (key) {
    case 'mode':
      return NATIVE_MODE_KEY;
    case 'previousServer':
      return PREVIOUS_SERVER_KEY;
    default:
      return '';
  }
};

export const setPreference = async (
  key: string,
  value: NativeMode | FrontEndHost
) => {
  const stringValue = JSON.stringify(value);
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({
      key,
      value: stringValue,
    });
  } else {
    localStorage.setItem(getStorageKey(key), stringValue);
  }
};

export const getPreference = async (key: string, defaultValue: string) => {
  if (Capacitor.isNativePlatform()) {
    const ret = await Preferences.get({ key });
    return JSON.parse(ret.value ?? defaultValue);
  } else {
    return localStorage.getItem(getStorageKey(key));
  }
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
