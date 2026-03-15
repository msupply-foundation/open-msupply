import { Observable } from "../../utilities/index.js";
/**
 * @deprecated `fromPromise` will be removed in Apollo Client 4.0. This is safe
 * to use in 3.x.
 *
 * **Recommended now**
 *
 * No action needed
 *
 * **When upgrading**
 *
 * Use RxJS's [`from`](https://rxjs.dev/api/index/function/from) function.
 *
 * ```ts
 * const observable = from(promise);
 * ```
 */
export declare function fromPromise<T>(promise: Promise<T>): Observable<T>;
//# sourceMappingURL=fromPromise.d.ts.map