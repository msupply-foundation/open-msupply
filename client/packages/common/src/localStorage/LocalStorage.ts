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

  setItem(key: LocalStorageKey, value: unknown): void {
    const stringified = JSON.stringify(value);
    localStorage.setItem(this.createStorageKey(key), stringified);

    this.listeners.forEach(listener => listener(key, value));
  }

  getItem<T>(key: LocalStorageKey, defaultValue: T | null = null): T | null {
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
}

export default new LocalStorage();
