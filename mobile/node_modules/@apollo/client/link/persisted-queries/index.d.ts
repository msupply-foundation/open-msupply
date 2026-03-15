import type { DocumentNode, FormattedExecutionResult, GraphQLFormattedError } from "graphql";
import type { Operation } from "../core/index.js";
import { ApolloLink } from "../core/index.js";
import type { NetworkError } from "../../errors/index.js";
export declare const VERSION = 1;
export interface ErrorResponse {
    /**
     * @deprecated `graphQLErrors` will no longer available in options in Apollo Client 4.0.
     * This value is safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When upgrading**
     *
     * `graphQLErrors` has been consolidated to the `error` property. You will need to
     * read the error from the `error` property.
     */
    graphQLErrors?: ReadonlyArray<GraphQLFormattedError>;
    /**
     * @deprecated `networkError` will no longer available in options in Apollo Client 4.0.
     * This value is safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When upgrading**
     *
     * `networkError` has been consolidated to the `error` property. You will need to
     * read the error from the `error` property.
     */
    networkError?: NetworkError;
    /**
     * @deprecated `response` has renamed to `result` in Apollo Client 4.0. This
     * property is safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When migrating**
     *
     * Use the `result` property instead of `response` inside your callback function.
     */
    response?: FormattedExecutionResult;
    operation: Operation;
    meta: ErrorMeta;
}
type ErrorMeta = {
    persistedQueryNotSupported: boolean;
    persistedQueryNotFound: boolean;
};
type SHA256Function = (...args: any[]) => string | PromiseLike<string>;
type GenerateHashFunction = (document: DocumentNode) => string | PromiseLike<string>;
interface BaseOptions {
    disable?: (error: ErrorResponse) => boolean;
    retry?: (error: ErrorResponse) => boolean;
    useGETForHashedQueries?: boolean;
}
export declare namespace PersistedQueryLink {
    interface SHA256Options extends BaseOptions {
        sha256: SHA256Function;
        generateHash?: never;
    }
    interface GenerateHashOptions extends BaseOptions {
        sha256?: never;
        generateHash: GenerateHashFunction;
    }
    export type Options = SHA256Options | GenerateHashOptions;
    export {};
}
export declare const createPersistedQueryLink: (options: PersistedQueryLink.Options) => ApolloLink & ({
    resetHashCache: () => void;
} & ({
    getMemoryInternals(): {
        PersistedQueryLink: {
            persistedQueryHashes: number;
        };
    };
} | {
    getMemoryInternals?: undefined;
}));
export {};
//# sourceMappingURL=index.d.ts.map