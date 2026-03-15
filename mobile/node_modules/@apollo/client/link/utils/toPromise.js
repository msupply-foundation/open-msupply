import { invariant } from "../../utilities/globals/index.js";
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
export function toPromise(observable) {
    var completed = false;
    return new Promise(function (resolve, reject) {
        observable.subscribe({
            next: function (data) {
                if (completed) {
                    globalThis.__DEV__ !== false && invariant.warn(57);
                }
                else {
                    completed = true;
                    resolve(data);
                }
            },
            error: reject,
        });
    });
}
//# sourceMappingURL=toPromise.js.map