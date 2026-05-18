import { useState, useRef, Dispatch, SetStateAction } from 'react';

type HasId = { id: string } | null | undefined;

const isHasId = (value: unknown): value is { id: string } =>
  value != null && typeof value === 'object' && 'id' in value;

// Uses Object.is for comparison — which checks by value for primitives
// and by reference for objects, with special handling for Dates and { id } objects.
const defaultIsEqual = <T>(a: T, b: T): boolean => {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (isHasId(a) && isHasId(b)) return a.id === b.id;
  return false;
};

type Primitive = string | number | boolean | null | undefined;
type IsEqual<T> = (a: T, b: T) => boolean;

// It is generally discouraged to sync props and state. Generally, you should just use
// props. Other times, you may want to seed some state with props (useState(props.value))
// it is rare that you should try to sync state and props - essentially, this is the same
// as seeding your state with props, however, new prop values can update the state. This occurs
// when there is some other side effect that is able to update the content of some component -
// i.e. if a network request results in different values for some prop than what a component
// was initially mounted with. If you can, try to avoid using this hook and find a different way
// but if there isn't one, here you go!

// isEqual is optional for primitives, Dates, and objects with an `id` field
// (defaultIsEqual handles primitives/Dates/ objects with ids.
// For other object types, isEqual is required — omitting it would cause
// reference-equality checks that lead to unnecessary re-syncs or infinite
// loops when the parent re-renders.
type OptionalIsEqual<T> = [isEqual?: IsEqual<T>];
type RequiredIsEqual<T> = [isEqual: IsEqual<T>];

export function useBufferState<T>(
  value: T,
  ...[isEqual]: [T] extends [Primitive | Date | HasId]
    ? OptionalIsEqual<T>
    : RequiredIsEqual<T>
): [T, Dispatch<SetStateAction<T>>] {
  isEqual ??= defaultIsEqual;
  const [buffer, setBuffer] = useState(value);
  const prevValueRef = useRef(value);

  if (!isEqual(prevValueRef.current, value)) {
    prevValueRef.current = value;
    setBuffer(value);
  }

  return [buffer, setBuffer];
}
