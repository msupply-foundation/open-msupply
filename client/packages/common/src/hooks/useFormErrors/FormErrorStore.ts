export type FieldErrorEntry = {
  error: string | null;
  label?: string;
  required?: boolean;
  requiredError?: string | null;
};

type Listener = () => void;

type Code = string;

class FormErrorStore {
  private snapshot: Record<string, FieldErrorEntry> = {};
  private errors: Record<Code, FieldErrorEntry> = {};
  private listeners = new Set<Listener>();

  getSnapshot = () => this.snapshot;

  subscribe = (callback: Listener) => {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  };

  private notify = () => {
    this.snapshot = { ...this.errors };
    for (const listener of this.listeners) {
      listener();
    }
  };

  registerField = (code: string, errorData?: Partial<FieldErrorEntry>) => {
    if (!(code in this.errors)) {
      this.errors[code] = {
        error: null,
        ...errorData,
      };
      this.notify();
    }
  };

  unregisterField = (code: string) => {
    if (code in this.errors) {
      delete this.errors[code];
      this.notify();
    }
  };

  setError = (code: string, error: string | null) => {
    const existing = this.errors[code];
    if (existing?.error !== error) {
      this.errors[code] = {
        ...existing,
        error,
      };
      this.notify();
    }
  };

  updateFieldErrorData = (
    code: string,
    errorData: Partial<FieldErrorEntry>
  ) => {
    console.log('Setting', code, errorData);
    const existing = this.errors[code];
    if (existing) {
      this.errors[code] = {
        ...existing,
        ...errorData,
        error: errorData.error !== undefined ? errorData.error : existing.error, // 🔧 fix
      };
      this.notify();
    }
  };

  getErrorData = (code: string): FieldErrorEntry => {
    if (!this.errors?.[code]) {
      return { error: null };
    }
    return this.errors[code];
  };

  clearAllErrors = () => {
    let changed = false;
    for (const key in this.errors) {
      const entry = this.errors[key];
      if (entry?.error !== null) {
        this.errors[key] = {
          ...entry,
          error: null,
        };
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  };
}

export const formErrorStore = new FormErrorStore();
