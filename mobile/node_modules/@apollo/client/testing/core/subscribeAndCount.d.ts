import type { ObservableSubscription, Observable } from "../../utilities/index.js";
/**
 * @deprecated `subscribeAndCount` will be removed in Apollo Client 4.0. Please
 * discontinue using this function.
 */
export default function subscribeAndCount<TResult>(reject: (reason: any) => any, observable: Observable<TResult>, cb: (handleCount: number, result: TResult) => any): ObservableSubscription;
//# sourceMappingURL=subscribeAndCount.d.ts.map