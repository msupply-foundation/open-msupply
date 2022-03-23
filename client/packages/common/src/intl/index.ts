export { LocaleKey } from './locales';

export * from './currency';
export * from './utils';
export * from './strings';
export * from './number';
export * from './date';
export * from './currency';
export * from './context';

/* 
Removing this unused method breaks things. Some components in
Host start to become undefined and aren't resolved.
Something with the imports and circular dependencies, probably.
If you can fix it, you will be rewarded.
*/
import { useAuthContext } from '../authentication';
export const useUserName = (): string => {
  const { user } = useAuthContext();
  return user?.name ?? '';
};
