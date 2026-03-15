import { Observable } from "../../index.js";
import type { CreateMultipartSubscriptionOptions } from "../shared.js";
/**
 * @deprecated `createFetchMultipartSubscription` will be removed in Apollo
 * Client 4.0. `urql` has native support for Apollo multipart subscriptions,
 * so you don't need to use this function anymore.
 */
export declare function createFetchMultipartSubscription(uri: string, { fetch: preferredFetch, headers }?: CreateMultipartSubscriptionOptions): ({ query, variables, }: {
    query?: string;
    variables: undefined | Record<string, any>;
}) => Observable<unknown>;
//# sourceMappingURL=index.d.ts.map