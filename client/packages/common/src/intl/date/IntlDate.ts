export const useFormatDate =
  (): ((
    value: number | Date,
    options?: Intl.DateTimeFormatOptions & { format?: string } & {
      month?: string;
      day?: string;
      year?: string;
      weekday?: string;
    }
  ) => string) =>
  (val, formatParams) =>
    new Intl.DateTimeFormat(navigator.language, formatParams).format(val);
