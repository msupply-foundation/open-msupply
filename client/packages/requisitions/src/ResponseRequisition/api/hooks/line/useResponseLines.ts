import { ResponseLineFragment } from '../../operations.generated';
import { useResponseFields } from '../document/useResponseFields';

export const useResponseLines = (): ResponseLineFragment[] => {
  const { lines } = useResponseFields('lines');

  return lines.nodes;
};
