import { LocalStorageKey } from './keys';

/**
 * Simple interface over a browser localStorage.
 *
 * Should be used instead of directly accessing the window
 * object localStorage interface so that we are able to track
 * which variables are in use under what keys and for ease
 * of de/serializing.
 *
 * TODO: Implement an observer pattern to allow for reactivity within
 * the ui whenever localStorage key/value pairs are updated through this
 * interface.
 *
 */

class LocalStorage {
  AppPrefix = '@openmsupply-client';

  createStorageKey(key: LocalStorageKey): string {
    return `${this.AppPrefix}${key}`;
  }

  setItem(key: LocalStorageKey, value: unknown): void {
    const stringified = JSON.stringify(value);
    localStorage.setItem(this.createStorageKey(key), stringified);
  }

  getItem<T>(key: LocalStorageKey, defaultValue: T | null = null): T {
    const item = localStorage.getItem(this.createStorageKey(key));
    return JSON.parse(item ?? '') ?? defaultValue;
  }
}

export default new LocalStorage();
