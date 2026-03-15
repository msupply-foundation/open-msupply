import type { DocumentNode, GraphQLFormattedError } from "graphql";
import type { ApolloCache } from "../cache/index.js";
import type { FetchResult, IncrementalPayload } from "../link/core/index.js";
import type { ApolloError } from "../errors/index.js";
import type { NetworkStatus } from "./networkStatus.js";
import type { Resolver } from "./LocalState.js";
import type { ObservableQuery } from "./ObservableQuery.js";
import type { QueryOptions } from "./watchQueryOptions.js";
import type { Cache } from "../cache/index.js";
import type { IsStrictlyAny } from "../utilities/index.js";
import type { Unmasked } from "../masking/index.js";
export type { TypedDocumentNode } from "@graphql-typed-document-node/core";
export type MethodKeys<T> = {
    [P in keyof T]: T[P] extends Function ? P : never;
}[keyof T];
export interface DefaultContext extends Record<string, any> {
}
export type OnQueryUpdated<TResult> = (observableQuery: ObservableQuery<any>, diff: Cache.DiffResult<any>, lastDiff: Cache.DiffResult<any> | undefined) => boolean | TResult;
export type RefetchQueryDescriptor = string | DocumentNode;
export type InternalRefetchQueryDescriptor = RefetchQueryDescriptor | QueryOptions;
type RefetchQueriesIncludeShorthand = "all" | "active";
export type RefetchQueriesInclude = RefetchQueryDescriptor[] | RefetchQueriesIncludeShorthand;
export type InternalRefetchQueriesInclude = InternalRefetchQueryDescriptor[] | RefetchQueriesIncludeShorthand;
export interface RefetchQueriesOptions<TCache extends ApolloCache<any>, TResult> {
    updateCache?: (cache: TCache) => void;
    include?: RefetchQueriesInclude;
    optimistic?: boolean;
    onQueryUpdated?: OnQueryUpdated<TResult> | null;
}
export type RefetchQueriesPromiseResults<TResult> = IsStrictlyAny<TResult> extends true ? any[] : TResult extends boolean ? InteropApolloQueryResult<any>[] : TResult extends PromiseLike<infer U> ? U[] : TResult[];
export interface RefetchQueriesResult<TResult> extends Promise<RefetchQueriesPromiseResults<TResult>> {
    queries: ObservableQuery<any>[];
    results: InternalRefetchQueriesResult<TResult>[];
}
export interface InternalRefetchQueriesOptions<TCache extends ApolloCache<any>, TResult> extends Omit<RefetchQueriesOptions<TCache, TResult>, "include"> {
    include?: InternalRefetchQueriesInclude;
    removeOptimistic?: string;
}
export type InternalRefetchQueriesResult<TResult> = TResult extends boolean ? Promise<InteropApolloQueryResult<any>> : TResult;
export type InternalRefetchQueriesMap<TResult> = Map<ObservableQuery<any>, InternalRefetchQueriesResult<TResult>>;
export type { QueryOptions as PureQueryOptions };
export type OperationVariables = Record<string, any>;
export interface ApolloQueryResult<T> {
    /**
     * An object containing the result of your GraphQL query after it completes.
     * 
     * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
     * 
     * @docGroup
     * 
     * 1. Operation data
     */
    data: T;
    /**
     * A list of any errors that occurred during server-side execution of a GraphQL operation.
     * See https://www.apollographql.com/docs/react/data/error-handling/ for more information.
     */
    errors?: ReadonlyArray<GraphQLFormattedError>;
    /**
     * The single Error object that is passed to onError and useQuery hooks, and is often thrown during manual `client.query` calls.
     * This will contain both a NetworkError field and any GraphQLErrors.
     * See https://www.apollographql.com/docs/react/data/error-handling/ for more information.
     */
    error?: ApolloError;
    loading: boolean;
    networkStatus: NetworkStatus;
    partial?: boolean;
}
/**
 * @deprecated This type does not exist in Apollo Client 4.0 and is meant as a
 * bridge between versions for deprecations.
 */
export interface InteropApolloQueryResult<T> {
    /**
     * An object containing the result of your GraphQL query after it completes.
     * 
     * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
     * 
     * @docGroup
     * 
     * 1. Operation data
     */
    data: T;
    /**
     * @deprecated `errors` will no longer available on the result in Apollo Client 4.0.
     * This value is safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When upgrading**
     *
     * `errors` has been consolidated to the `error` property. You will need to
     * read any errors on the `error` property on the resolved value instead.
     */
    errors?: ReadonlyArray<GraphQLFormattedError>;
    /**
     * The single Error object that is passed to onError and useQuery hooks, and is often thrown during manual `client.query` calls.
     * This will contain both a NetworkError field and any GraphQLErrors.
     * See https://www.apollographql.com/docs/react/data/error-handling/ for more information.
     */
    error?: ApolloError;
    /**
     * @deprecated `loading` will no longer available on the result in Apollo Client 4.0.
     * This value is always true when the resolved and can safely ignored.
     */
    loading: boolean;
    /**
     * @deprecated `loading` will no longer available on the result in Apollo Client 4.0.
     * This value is always `NetworkStatus.ready` or `NetworkStatus.error`. To
     * determine if the result contains an error, read from the `error` or `errors`
     * property instead.
     */
    networkStatus: NetworkStatus;
    /**
     * @deprecated `partial` will no longer available on the result in Apollo Client 4.0.
     * This value is always `false` if there is a data value since the result
     * never contains partial cache data.
     */
    partial?: boolean;
}
/**
 * @deprecated This type does not exist in Apollo Client 4.0 and is meant as a
 * bridge between versions for deprecations.
 */
interface InteropSingleExecutionResult<TData = Record<string, any>, TContext = DefaultContext, TExtensions = Record<string, any>> {
    data?: TData | null;
    /**
     * @deprecated `context` will no longer available on the result in Apollo Client 4.0.
     */
    context?: TContext;
    /**
     * @deprecated `errors` is no longer available on the result in Apollo Client 4.0.
     * This value is safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When upgrading**
     *
     * `errors` has been consolidated to the `error` property. You will need to
     * read any errors on the `error` property on the resolved value instead.
     */
    errors?: ReadonlyArray<GraphQLFormattedError>;
    extensions?: TExtensions;
}
/**
 * @deprecated This type does not exist in Apollo Client 4.0 and is meant as a
 * bridge between versions for deprecations.
 */
export interface InteropMutationExecutionPatchInitialResult<TData = Record<string, any>, TExtensions = Record<string, any>> {
    /**
     * @deprecated `hasNext` will no longer available on the result in Apollo Client 4.0.
     */
    hasNext?: boolean;
    data: TData | null | undefined;
    /**
     * @deprecated `incremental` will no longer available on the result in Apollo Client 4.0.
     */
    incremental?: never;
    /**
     * @deprecated `errors` is no longer available on the result in Apollo Client 4.0.
     * This value is safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When upgrading**
     *
     * `errors` has been consolidated to the `error` property. You will need to
     * read any errors on the `error` property on the resolved value instead.
     */
    errors?: ReadonlyArray<GraphQLFormattedError>;
    extensions?: TExtensions;
}
/**
 * @deprecated This type does not exist in Apollo Client 4.0 and is meant as a
 * bridge between versions for deprecations.
 */
export interface InteropMutationExecutionPatchIncrementalResult<TData = Record<string, any>, TExtensions = Record<string, any>> {
    /**
     * @deprecated `hasNext` will no longer available on the result in Apollo Client 4.0.
     * This value is safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When upgrading**
     *
     * `errors` has been consolidated to the `error` property. You will need to
     * read any errors on the `error` property on the resolved value instead.
     */
    hasNext?: boolean;
    /**
     * @deprecated `incremental` will no longer available on the result in Apollo Client 4.0.
     */
    incremental?: IncrementalPayload<TData, TExtensions>[];
    data?: never;
    /**
     * @deprecated `errors` is no longer available on the result in Apollo Client 4.0.
     * This value is safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When upgrading**
     *
     * `errors` has been consolidated to the `error` property. You will need to
     * read any errors on the `error` property on the resolved value instead.
     */
    errors?: never;
    extensions?: never;
}
/**
 * @deprecated This type does not exist in Apollo Client 4.0 and is meant as a
 * bridge between versions for deprecations.
 */
export type InteropExecutionPatchResult<TData = Record<string, any>, TExtensions = Record<string, any>> = InteropMutationExecutionPatchInitialResult<TData, TExtensions> | InteropMutationExecutionPatchIncrementalResult<TData, TExtensions>;
/**
 * @deprecated This type does not exist in Apollo Client 4.0 and is meant as a
 * bridge between versions for deprecations.
 */
export type InteropMutateResult<TData = Record<string, any>, TContext = DefaultContext, TExtensions = Record<string, any>> = InteropSingleExecutionResult<TData, TContext, TExtensions> | InteropExecutionPatchResult<TData, TExtensions>;
/**
 * @deprecated This type does not exist in Apollo Client 4.0 and is meant as a
 * bridge between versions for deprecations.
 */
export type InteropSubscribeResult<TData = Record<string, any>, TContext = DefaultContext, TExtensions = Record<string, any>> = InteropSingleExecutionResult<TData, TContext, TExtensions> | InteropExecutionPatchResult<TData, TExtensions>;
export type MutationQueryReducer<T> = (previousResult: Record<string, any>, options: {
    mutationResult: FetchResult<Unmasked<T>>;
    queryName: string | undefined;
    queryVariables: Record<string, any>;
}) => Record<string, any>;
export type MutationQueryReducersMap<T = {
    [key: string]: any;
}> = {
    [queryName: string]: MutationQueryReducer<T>;
};
/**
 * @deprecated Use `MutationUpdaterFunction` instead.
 */
export type MutationUpdaterFn<T = {
    [key: string]: any;
}> = (cache: ApolloCache<T>, mutationResult: FetchResult<T>) => void;
export type MutationUpdaterFunction<TData, TVariables, TContext, TCache extends ApolloCache<any>> = (cache: TCache, result: Omit<FetchResult<Unmasked<TData>>, "context">, options: {
    context?: TContext;
    variables?: TVariables;
}) => void;
export interface Resolvers {
    [key: string]: {
        [field: string]: Resolver;
    };
}
//# sourceMappingURL=types.d.ts.map