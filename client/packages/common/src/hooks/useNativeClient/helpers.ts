import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { FrontEndHost, NativeMode, NativeAPI } from './types';

export const getPreference = async (key: string, defaultValue?: string) => {
  try {
    const result = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key }))?.value
      : localStorage.getItem(`preference/${key}`);
    const value = result ?? defaultValue;

    return value ? JSON.parse(value) : '';
  } catch {
    return '';
  }
};

export const setPreference = async (
  key: string,
  obj: NativeMode | FrontEndHost
) => {
  try {
    const value = JSON.stringify(obj);
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(`preference/${key}`, value);
    }
  } catch (e) {
    console.log(e);
  }
};

export const removePreference = async (key: string) => {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(`preference/${key}`);
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
