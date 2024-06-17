import { UUID } from '@common/types';
import { uuidv7 } from 'uuidv7';

export const FnUtils = {
  generateUUID: (): UUID => uuidv7(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debounce: <T extends (...args: any[]) => any>(
    callback: T,
    wait = 500
  ): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
    let timer: NodeJS.Timeout | undefined;

    return (...args: Parameters<T>) => {
      if (timer) {
        clearTimeout(timer);
      }
      return new Promise<ReturnType<T>>(resolve => {
        timer = setTimeout(() => {
          const returnValue = callback(...args) as ReturnType<T>;
          resolve(returnValue);
        }, wait);
      });
    };
  },
};
