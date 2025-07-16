export type FieldErrorEntry = {
  error: string | null;
  isCustomError?: boolean;
  label?: string;
  required?: boolean;
  requiredError?: string | null;
};

type Listener = () => void;

type Code = string;

class FormErrorStore {
  private snapshot: Record<Code, FieldErrorEntry> = {};
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

  setError = (code: string, error: string | null, isCustomError?: boolean) => {
    const existing = this.errors[code];
    if (existing?.error !== error) {
      // This ensures that Custom Errors will take priority over component's
      // internal errors
      if (existing?.isCustomError && !isCustomError) return;
      this.errors[code] = {
        ...existing,
        error,
        isCustomError: error ? isCustomError : false,
      };
      this.notify();
    }
  };

  updateFieldErrorData = (
    code: string,
    errorData: Partial<FieldErrorEntry>
  ) => {
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
    Object.keys(this.errors).forEach(key => {
      const entry = this.errors[key];
      if (entry?.error !== null) {
        this.errors[key] = {
          ...entry,
          error: null,
        };
        changed = true;
      }
    });
    if (changed) {
      this.notify();
    }
  };
}

export const formErrorStore = new FormErrorStore();
