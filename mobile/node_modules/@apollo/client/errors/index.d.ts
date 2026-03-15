import "../utilities/globals/index.js";
import type { GraphQLError, GraphQLErrorExtensions, GraphQLFormattedError } from "graphql";
import type { ServerParseError } from "../link/http/index.js";
import type { ServerError } from "../link/utils/index.js";
import type { FetchResult } from "../link/core/index.js";
export declare const PROTOCOL_ERRORS_SYMBOL: unique symbol;
type FetchResultWithSymbolExtensions<T> = FetchResult<T> & {
    extensions: Record<string | symbol, any>;
};
export interface ApolloErrorOptions {
    graphQLErrors?: ReadonlyArray<GraphQLFormattedError>;
    protocolErrors?: ReadonlyArray<GraphQLFormattedError>;
    clientErrors?: ReadonlyArray<Error>;
    networkError?: Error | ServerParseError | ServerError | null;
    errorMessage?: string;
    extraInfo?: any;
}
export declare function graphQLResultHasProtocolErrors<T>(result: FetchResult<T>): result is FetchResultWithSymbolExtensions<T>;
/**
 * @deprecated `isApolloError` will be removed with Apollo Client 4.0. This
 * function is safe to use in Apollo Client 3.x.
 *
 * **Recommended now**
 *
 * No action needed
 *
 * **When migrating**
 *
 * Errors are no longer wrapped in Apollo Client 4.0. To check if an error is an
 * instance of an error provided by Apollo Client, use the static `.is` method
 * on the error class you want to test against.
 *
 * ```ts
 * // Test if an error is an instance of `CombinedGraphQLErrors`
 * const isGraphQLErrors = CombinedGraphQLErrors.is(error);
 * ```
 */
export declare function isApolloError(err: Error): err is ApolloError;
/**
 * @deprecated This type is deprecated and will be removed in the next major version of Apollo Client.
 * It mistakenly referenced `GraqhQLError` instead of `GraphQLFormattedError`.
 *
 * Use `ReadonlyArray<GraphQLFormattedError>` instead.
 */
export type GraphQLErrors = ReadonlyArray<GraphQLError>;
export type NetworkError = Error | ServerParseError | ServerError | null;
export declare class ApolloError extends Error {
    name: string;
    message: string;
    graphQLErrors: ReadonlyArray<GraphQLFormattedError>;
    protocolErrors: ReadonlyArray<GraphQLFormattedError>;
    clientErrors: ReadonlyArray<Error>;
    networkError: Error | ServerParseError | ServerError | null;
    /**
     * Indicates the specific original cause of the error.
     *
     * This field contains the first available `networkError`, `graphQLError`, `protocolError`, `clientError`, or `null` if none are available.
     */
    cause: ({
        readonly message: string;
        extensions?: GraphQLErrorExtensions[] | GraphQLFormattedError["extensions"];
    } & Omit<Partial<Error> & Partial<GraphQLFormattedError>, "extensions">) | null;
    extraInfo: any;
    constructor({ graphQLErrors, protocolErrors, clientErrors, networkError, errorMessage, extraInfo, }: ApolloErrorOptions);
}
export {};
//# sourceMappingURL=index.d.ts.map