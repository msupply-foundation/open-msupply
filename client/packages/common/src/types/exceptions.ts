import { AuthError } from '../authentication';

interface Extensions {
  details: string;
}

interface Location {
  column: number;
  line: number;
}

interface ApiException {
  extensions: Extensions;
  locations: Location[];
  message: string;
  path: string[];
}

export const isPermissionDeniedException = (e?: any) =>
  !!e && (e as ApiException).message === AuthError.PermissionDenied;
