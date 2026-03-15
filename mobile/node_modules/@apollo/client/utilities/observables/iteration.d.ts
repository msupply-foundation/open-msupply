import type { Observer } from "./Observable.js";
/**
 * @deprecated `iterateObserversSafely` will be removed with Apollo Client 4.0.
 * Please discontinue using this function.
 */
export declare function iterateObserversSafely<E, A>(observers: Set<Observer<E>>, method: keyof Observer<E>, argument?: A): void;
//# sourceMappingURL=iteration.d.ts.map