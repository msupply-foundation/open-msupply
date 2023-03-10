import { AuthError } from '../authentication';

interface Extensions {
  details: string;
}

interface Location {
  column: number;
  line: number;
}

export interface ApiException {
  extensions: Extensions;
  locations: Location[];
  message: string;
  path: string[];
}

export const isPermissionDeniedException = (e?: ApiException) =>
  !!e &&
  'message' in e &&
  (e as ApiException).message === AuthError.PermissionDenied;
