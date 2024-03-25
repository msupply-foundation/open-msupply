import { useEffect, useState } from 'react';

export const useFetchedBufferState = <T>(input: T, isFetched: boolean) => {
  const [state, setState] = useState<T>(input);

  useEffect(() => setState(input), [isFetched]);

  return [state, setState] as const;
};
