export type ConvertData<D, A, R> = (input: { data: D; arguments: A }) => { data: R };
export type ArrayElement<T> = T extends (infer U)[] ? U : T;

declare global {
  var log: (_: any) => void;
}
