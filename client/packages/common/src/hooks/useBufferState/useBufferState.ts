import { useEffect, useState, Dispatch, SetStateAction } from 'react';

// It is generally discouraged to sync props and state. Generally, you should just use
// props. Other times, you may want to seed some state with props (useState(props.value))
// it is rare that you should try to sync state and props - essentially, this is the same
// as seeding your state with props, however, new prop values can update the state. This occurs
// when there is some other side effect that is able to update the content of some component -
// i.e. if a network request results in different values for some prop than what a component
// was initially mounted with. If you can, try to avoid using this hook and find a different way
// but if there isn't one, here you go!
export const useBufferState = <T>(
  value: T
): [T, Dispatch<SetStateAction<T>>] => {
  const [buffer, setBuffer] = useState(value);

  useEffect(() => {
    setBuffer(value);
  }, [value]);

  return [buffer, setBuffer];
};
