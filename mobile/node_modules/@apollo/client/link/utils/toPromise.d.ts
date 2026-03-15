import type { Observable } from "../../utilities/index.js";
/**
 * @deprecated `toPromise` will be removed in Apollo Client 4.0. This is safe
 * to use in 3.x.
 *
 * **Recommended now**
 *
 * No action needed
 *
 * **When upgrading**
 *
 * Use RxJS's [`firstValueFrom`](https://rxjs.dev/api/index/function/firstValueFrom) function.
 *
 * ```ts
 * const result = await firstValueFrom(observable);
 * ```
 */
export declare function toPromise<R>(observable: Observable<R>): Promise<R>;
//# sourceMappingURL=toPromise.d.ts.map