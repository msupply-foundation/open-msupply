import { NetworkStatus } from "./networkStatus.js";
import type { Concast, Observer, ObservableSubscription } from "../utilities/index.js";
import { Observable } from "../utilities/index.js";
import { ApolloError } from "../errors/index.js";
import type { QueryManager } from "./QueryManager.js";
import type { ApolloQueryResult, InteropApolloQueryResult, OperationVariables, TypedDocumentNode } from "./types.js";
import type { WatchQueryOptions, FetchMoreQueryOptions, SubscribeToMoreOptions, UpdateQueryMapFn } from "./watchQueryOptions.js";
import type { QueryInfo } from "./QueryInfo.js";
import type { MissingFieldError } from "../cache/index.js";
import type { MissingTree } from "../cache/core/types/common.js";
import type { MaybeMasked, Unmasked } from "../masking/index.js";
export interface FetchMoreOptions<TData = any, TVariables = OperationVariables> {
    updateQuery?: (previousQueryResult: TData, options: {
        fetchMoreResult?: TData;
        variables?: TVariables;
    }) => TData;
}
export declare class ObservableQuery<TData = any, TVariables extends OperationVariables = OperationVariables> extends Observable<ApolloQueryResult<MaybeMasked<TData>>> {
    /**
     * @internal
     * A slot used by the `useQuery` hook to indicate that `client.watchQuery`
     * should not register the query immediately, but instead wait for the query to
     * be started registered with the `QueryManager` when `useSyncExternalStore`
     * actively subscribes to it.
     */
    private static inactiveOnCreation;
    readonly options: WatchQueryOptions<TVariables, TData>;
    /**
     * @deprecated `queryId` will be removed in Apollo Client 4.0. This value is
     * safe to use in Apollo Client 3.x.
     *
     * **Recommended now**
     *
     * `ObservableQuery` does not have a unique identifier in 4.0. If you rely on
     * this value, please try to migrate away from it.
     */
    readonly queryId: string;
    readonly queryName?: string;
    get query(): TypedDocumentNode<TData, TVariables>;
    /**
     * An object containing the variables that were provided for the query.
     */
    get variables(): TVariables | undefined;
    private isTornDown;
    private queryManager;
    private observers;
    private subscriptions;
    private waitForOwnResult;
    private last?;
    private lastQuery?;
    private queryInfo;
    private concast?;
    private observer?;
    private pollingInfo?;
    private _getOrCreateQuery;
    constructor({ queryManager, queryInfo, options, }: {
        queryManager: QueryManager<any>;
        queryInfo: QueryInfo;
        options: WatchQueryOptions<TVariables, TData>;
    });
    /**
     * @deprecated `result` will be removed in Apollo Client 4.0.
     *
     * **Recommended now**
     *
     * If you continue to need this functionality, subscribe to `ObservableQuery`
     * to get the first value emitted from the observable, then immediately unsubscribe.
     *
     * **When upgrading**
     *
     * Use RxJS's [`firstResultFrom`](https://rxjs.dev/api/index/function/firstValueFrom) function to mimic this functionality.
     *
     * ```ts
     * const result = await firstValueFrom(from(observableQuery));
     * ```
     */
    result(): Promise<ApolloQueryResult<MaybeMasked<TData>>>;
    /** @internal */
    resetDiff(): void;
    private getCurrentFullResult;
    getCurrentResult(saveAsLastResult?: boolean): ApolloQueryResult<MaybeMasked<TData>>;
    isDifferentFromLastResult(newResult: ApolloQueryResult<TData>, variables?: TVariables): boolean | undefined;
    private getLast;
    /**
     * @deprecated `getLastResult` will be removed in Apollo Client 4.0. Please
     * discontinue using this method.
     */
    getLastResult(variablesMustMatch?: boolean): ApolloQueryResult<TData> | undefined;
    /**
     * @deprecated `getLastError` will be removed in Apollo Client 4.0. Please
     * discontinue using this method.
     */
    getLastError(variablesMustMatch?: boolean): ApolloError | undefined;
    /**
     * @deprecated `resetLastResults` will be removed in Apollo Client 4.0. Please
     * discontinue using this method.
     */
    resetLastResults(): void;
    /**
     * @deprecated `resetQueryStoreErrors` will be removed in Apollo Client 4.0.
     * Please discontinue using this method.
     */
    resetQueryStoreErrors(): void;
    /**
     * Update the variables of this observable query, and fetch the new results.
     * This method should be preferred over `setVariables` in most use cases.
     *
     * @param variables - The new set of variables. If there are missing variables,
     * the previous values of those variables will be used.
     */
    refetch(variables?: Partial<TVariables>): Promise<InteropApolloQueryResult<MaybeMasked<TData>>>;
    /**
     * A function that helps you fetch the next set of results for a [paginated list field](https://www.apollographql.com/docs/react/pagination/core-api/).
     */
    fetchMore<TFetchData = TData, TFetchVars extends OperationVariables = TVariables>(fetchMoreOptions: FetchMoreQueryOptions<TFetchVars, TFetchData> & {
        updateQuery?: (previousQueryResult: Unmasked<TData>, options: {
            fetchMoreResult: Unmasked<TFetchData>;
            variables: TFetchVars;
        }) => Unmasked<TData>;
    }): Promise<InteropApolloQueryResult<MaybeMasked<TFetchData>>>;
    /**
     * A function that enables you to execute a [subscription](https://www.apollographql.com/docs/react/data/subscriptions/), usually to subscribe to specific fields that were included in the query.
     *
     * This function returns _another_ function that you can call to terminate the subscription.
     */
    subscribeToMore<TSubscriptionData = TData, TSubscriptionVariables extends OperationVariables = TVariables>(options: SubscribeToMoreOptions<TData, TSubscriptionVariables, TSubscriptionData, TVariables>): () => void;
    /**
     * @deprecated `setOptions` will be removed in Apollo Client 4.0. Please use
     * `observableQuery.reobserve(newOptions)` instead.
     */
    setOptions(newOptions: Partial<WatchQueryOptions<TVariables, TData>>): Promise<InteropApolloQueryResult<MaybeMasked<TData>>>;
    silentSetOptions(newOptions: Partial<WatchQueryOptions<TVariables, TData>>): void;
    /**
     * Update the variables of this observable query, and fetch the new results
     * if they've changed. Most users should prefer `refetch` instead of
     * `setVariables` in order to to be properly notified of results even when
     * they come from the cache.
     *
     * Note: the `next` callback will *not* fire if the variables have not changed
     * or if the result is coming from cache.
     *
     * Note: the promise will return the old results immediately if the variables
     * have not changed.
     *
     * Note: the promise will return null immediately if the query is not active
     * (there are no subscribers).
     *
     * @param variables - The new set of variables. If there are missing variables,
     * the previous values of those variables will be used.
     */
    setVariables(variables: TVariables): Promise<InteropApolloQueryResult<MaybeMasked<TData>> | void>;
    /**
     * A function that enables you to update the query's cached result without executing a followup GraphQL operation.
     *
     * See [using updateQuery and updateFragment](https://www.apollographql.com/docs/react/caching/cache-interaction/#using-updatequery-and-updatefragment) for additional information.
     */
    updateQuery(mapFn: UpdateQueryMapFn<TData, TVariables>): void;
    /**
     * A function that instructs the query to begin re-executing at a specified interval (in milliseconds).
     */
    startPolling(pollInterval: number): void;
    /**
     * A function that instructs the query to stop polling after a previous call to `startPolling`.
     */
    stopPolling(): void;
    private applyNextFetchPolicy;
    private fetch;
    private updatePolling;
    private updateLastResult;
    reobserveAsConcast(newOptions?: Partial<WatchQueryOptions<TVariables, TData>>, newNetworkStatus?: NetworkStatus): Concast<ApolloQueryResult<TData>>;
    reobserve(newOptions?: Partial<WatchQueryOptions<TVariables, TData>>, newNetworkStatus?: NetworkStatus): Promise<InteropApolloQueryResult<MaybeMasked<TData>>>;
    resubscribeAfterError(onNext: (value: ApolloQueryResult<MaybeMasked<TData>>) => void, onError?: (error: any) => void, onComplete?: () => void): ObservableSubscription;
    resubscribeAfterError(observer: Observer<ApolloQueryResult<TData>>): ObservableSubscription;
    private observe;
    private reportResult;
    private reportError;
    hasObservers(): boolean;
    private tearDownQuery;
    private transformDocument;
    private maskResult;
    private dirty;
    private notifyTimeout?;
    /** @internal */
    protected resetNotifications(): void;
    private cancelNotifyTimeout;
    /** @internal */
    protected scheduleNotify(): void;
    /** @internal */
    protected notify(): void;
    private reobserveCacheFirst;
}
export declare function logMissingFieldErrors(missing: MissingFieldError[] | MissingTree | undefined): void;
//# sourceMappingURL=ObservableQuery.d.ts.map