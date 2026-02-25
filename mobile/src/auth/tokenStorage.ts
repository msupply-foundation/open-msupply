import * as Keychain from 'react-native-keychain';

const SERVICE = 'org.openmsupply.mobile';

export const tokenStorage = {
  async setToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('token', token, {service: SERVICE});
  },

  async getToken(): Promise<string | null> {
    const result = await Keychain.getGenericPassword({service: SERVICE});
    return result ? result.password : null;
  },

  async clearToken(): Promise<void> {
    await Keychain.resetGenericPassword({service: SERVICE});
  },
};
