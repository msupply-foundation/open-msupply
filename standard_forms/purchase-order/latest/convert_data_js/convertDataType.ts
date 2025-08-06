export type ConvertData<D, R> = (input: { data: D }) => { data: R };
export type ArrayElement<T> = T extends (infer U)[] ? U : T;

declare global {
  var log: (_: any) => void;
}
