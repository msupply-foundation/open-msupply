import { LocalStorageRecord, LocalStorageKey } from './keys';

/**
 * Simple interface over a browser localStorage.
 *
 * Should be used instead of directly accessing the window
 * object localStorage interface so that we are able to track
 * which variables are in use under what keys and for ease
 * of de/serializing.
 *
 */

type Listener<T> = (key: LocalStorageKey, value: T) => void;

class LocalStorage {
  listeners = new Map();

  AppPrefix = '@openmsupply-client';

  addListener<T>(fn: Listener<T>) {
    const symbol = Symbol();
    this.listeners.set(symbol, fn);

    return () => this.removeListener(symbol);
  }

  removeListener(symbol: symbol) {
    this.listeners.delete(symbol);
  }

  clearListeners() {
    this.listeners = new Map();
  }

  createStorageKey(key: LocalStorageKey): string {
    return `${this.AppPrefix}${key}`;
  }

  setItem<StorageKey extends Extract<LocalStorageKey, string>>(
    key: StorageKey,
    value: LocalStorageRecord[StorageKey]
  ): void {
    const existingValue = this.getItem(key);

    // Short circuit exit if values are unchanged
    if (existingValue === value) return;

    const stringified = JSON.stringify(value);

    localStorage.setItem(this.createStorageKey(key), stringified);

    this.listeners.forEach(listener => listener(key, value));
  }

  getItem<StorageKey extends Extract<LocalStorageKey, string>>(
    key: StorageKey,
    defaultValue: LocalStorageRecord[StorageKey] | null = null
  ): LocalStorageRecord[StorageKey] | null {
    const item = localStorage.getItem(this.createStorageKey(key));

    if (typeof item !== 'string') {
      return defaultValue;
    }

    try {
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  }

  removeItem<StorageKey extends Extract<LocalStorageKey, string>>(
    key: StorageKey
  ): void {
    const existingValue = this.getItem(key);

    // no need to alert listeners if already cleared
    if (existingValue === null) return;

    localStorage.removeItem(this.createStorageKey(key));
    this.listeners.forEach(listener => listener(key, null));
  }
}

export default new LocalStorage();
