import { useState, useRef, Dispatch, SetStateAction } from 'react';

// Uses Object.is for comparison — which checks by value for primitives
// and by reference for objects, with special handling for Dates. Callers
// passing object types that may be reconstructed with the same data but
// a new reference (e.g. NameRowFragment, LocationTypeFragment) should
// supply a custom isEqual to avoid unnecessary re-syncs — or an infinite
// loop if the parent also re-renders on every state change.
const defaultIsEqual = <T>(a: T, b: T): boolean => {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  return false;
};

// It is generally discouraged to sync props and state. Generally, you should just use
// props. Other times, you may want to seed some state with props (useState(props.value))
// it is rare that you should try to sync state and props - essentially, this is the same
// as seeding your state with props, however, new prop values can update the state. This occurs
// when there is some other side effect that is able to update the content of some component -
// i.e. if a network request results in different values for some prop than what a component
// was initially mounted with. If you can, try to avoid using this hook and find a different way
// but if there isn't one, here you go!
export const useBufferState = <T>(
  value: T,
  isEqual: (a: T, b: T) => boolean = defaultIsEqual
): [T, Dispatch<SetStateAction<T>>] => {
  const [buffer, setBuffer] = useState(value);
  const prevValueRef = useRef(value);

  if (!isEqual(prevValueRef.current, value)) {
    prevValueRef.current = value;
    setBuffer(value);
  }

  return [buffer, setBuffer];
};
