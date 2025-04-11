import { useLocation } from '@openmsupply-client/common';

export const usePathnameIncludes = (segment: string): boolean => {
  const location = useLocation();
  const urlSegments = location.pathname.split('/');
  return urlSegments.includes(segment);
};
