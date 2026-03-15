import { Observable } from "./Observable.js";
/**
 * @deprecated `asyncMap` will be removed in Apollo Client 4.0. This function is
 * safe to use in Apollo Client 3.x.
 *
 * **Recommended now**
 *
 * No action needed
 *
 * **When migrating**
 *
 * Prefer to use RxJS's built in helpers. Convert promises into observables
 * using the [`from`](https://rxjs.dev/api/index/function/from) function.
 */
export declare function asyncMap<V, R>(observable: Observable<V>, mapFn: (value: V) => R | PromiseLike<R>, catchFn?: (error: any) => R | PromiseLike<R>): Observable<R>;
//# sourceMappingURL=asyncMap.d.ts.map