import React, { FC, PropsWithChildren, useRef } from 'react';
import {
  GraphQLClient,
  RequestDocument,
  RequestOptions,
  Variables,
} from 'graphql-request';
import { AuthError, getAuthCookie } from '../authentication/AuthContext';
import { LocalStorage } from '../localStorage';
import { DefinitionNode, DocumentNode, OperationDefinitionNode } from 'graphql';
import { RequestConfig } from 'graphql-request/build/esm/types';
import { createRegisteredContext } from 'react-singleton-context';

export type SkipRequest = (documentNode: DocumentNode) => boolean;

const RETRYABLE_STATUS_CODES = [408, 502, 503];
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

interface HttpErrorResponse {
  response?: { status?: number };
}

const isHttpError = (reason: unknown): reason is HttpErrorResponse =>
  typeof reason === 'object' && reason !== null && 'response' in reason;

// these queries are allowed to fail silently with permission denied errors
// as they are for background data fetches only; the user will be notified
// by other, page-level, queries instead. Allowing the exceptions here
// prevents the display of multiple permission denied errors for a single page
const permissionExceptions = [
  'reports',
  'stockCounts',
  'invoiceCounts',
  'itemCounts',
  'requisitionCounts',
  'temperatureNotifications',
];

// these queries are not considered to be part of the user's activity
// they occur in the background and should not be used to determine
// if the user has remained active
const ignoredQueries = ['refreshToken', 'syncInfo', 'temperatureNotifications'];

// background/non-critical queries that should not be retried on failure
// to avoid adding unnecessary load when the server is under stress
const noRetryQueries = [
  'stockCounts',
  'inboundCounts',
  'outboundCounts',
  'internalOrderCounts',
  'requisitionCounts',
  'itemCounts',
  'syncInfo',
  'temperatureNotifications',
];

interface ResponseError {
  message?: string;
  path?: string[];
  extensions?: { details?: string };
}

export class GraphqlStdError extends Error {
  public stdError?: string | undefined;
  constructor(message: string, stdError: string | undefined) {
    super(message);
    this.stdError = stdError;
  }
}

const hasError = (errors: ResponseError[], error: AuthError) =>
  errors.some(({ message }: { message?: string }) => message === error);

const hasPermissionException = (errors: ResponseError[]) =>
  errors.every(({ path }: { path?: string[] }) =>
    (path || []).every(p => permissionExceptions.includes(p))
  );

const handleResponseError = (errors: ResponseError[]) => {
  if (hasError(errors, AuthError.Unauthenticated)) {
    LocalStorage.setItem('/error/auth', AuthError.Unauthenticated);
    return;
  }

  if (hasError(errors, AuthError.PermissionDenied)) {
    if (hasPermissionException(errors)) {
      throw errors[0];
    }
    LocalStorage.setItem('/error/auth', AuthError.PermissionDenied);
    return;
  }

  const error = errors[0];
  const { extensions } = error || {};
  const { details } = extensions || {};
  throw new GraphqlStdError(
    details || error?.message || 'Unknown error',
    error?.message
  );
};

const shouldIgnoreQuery = (definitionNode: DefinitionNode) => {
  const operationNode = definitionNode as OperationDefinitionNode;
  if (operationNode.operation !== 'query') return false;

  return ignoredQueries.indexOf(operationNode.name?.value ?? '') !== -1;
};

const shouldSkipRetry = (documentNode?: DocumentNode) =>
  documentNode?.definitions?.some(def => {
    const op = def as OperationDefinitionNode;
    return noRetryQueries.includes(op.name?.value ?? '');
  }) ?? false;

const shouldSaveRequestTime = (documentNode?: DocumentNode) =>
  documentNode && !documentNode?.definitions?.some(shouldIgnoreQuery);

class GQLClient extends GraphQLClient {
  private emptyData: object;
  private skipRequest: SkipRequest;
  private lastRequestTime: Date;
  private _url: string;

  constructor(
    url: string,
    options?: RequestConfig | undefined,
    skipRequest?: SkipRequest
  ) {
    super(url, options);
    this._url = url;
    this.emptyData = {};
    this.skipRequest = skipRequest || (() => false);
    this.lastRequestTime = new Date();
  }

  private async requestWithRetry<T>(
    makeRequest: () => Promise<T>,
    retriesRemaining: number = MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    try {
      return await makeRequest();
    } catch (reason: unknown) {
      const status = isHttpError(reason) ? reason.response?.status : undefined;
      const isRetryableStatus =
        status !== undefined && RETRYABLE_STATUS_CODES.includes(status);
      // "Failed to fetch" TypeErrors are typically caused by CORS-blocked
      // error responses (e.g. a 408 without CORS headers), network
      // interruptions, or DNS failures — all potentially transient.
      const isNetworkError =
        reason instanceof TypeError && reason.message === 'Failed to fetch';

      if ((isRetryableStatus || isNetworkError) && retriesRemaining > 0) {
        const label = isRetryableStatus ? `status ${status}` : 'network error';
        console.warn(
          `Request failed (${label}). Retrying... (${MAX_RETRY_ATTEMPTS - retriesRemaining + 1}/${MAX_RETRY_ATTEMPTS})`
        );
        const delay =
          RETRY_DELAY_MS * (MAX_RETRY_ATTEMPTS - retriesRemaining + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.requestWithRetry(makeRequest, retriesRemaining - 1);
      }
      throw reason;
    }
  }

  public request<T, V extends Variables | undefined>(
    documentOrOptions: RequestDocument | RequestOptions<Variables>,
    variables?: V,
    requestHeaders?: RequestInit['headers']
  ): Promise<T> {
    const options = documentOrOptions as RequestOptions<Variables>;
    const document = (
      typeof documentOrOptions !== 'string' && 'document' in documentOrOptions
        ? options.document
        : documentOrOptions
    ) as DocumentNode;

    if (this.skipRequest(document)) {
      return new Promise(() => this.emptyData);
    }

    if (shouldSaveRequestTime(document)) this.lastRequestTime = new Date();

    super.setHeader('Authorization', `Bearer ${getAuthCookie().token}`);

    const makeRequest = () =>
      options.document
        ? super.request<T>(options)
        : super.request<T>(
            documentOrOptions as RequestDocument,
            variables,
            requestHeaders
          );

    const request = shouldSkipRetry(document)
      ? makeRequest()
      : this.requestWithRetry(makeRequest);

    // returning an empty object in order to give the caller a stable reference
    // without it, the page will re-render continuously
    return request.then(
      data => (data ?? this.emptyData) as T,
      reason => {
        const { response } = reason;
        if (response && response.errors) {
          handleResponseError(response.errors);
          return this.emptyData as unknown as T;
        } else {
          throw new Error(`Error making API request: ${reason}`);
        }
      }
    );
  }

  public setSkipRequest = (skipRequest: SkipRequest) =>
    (this.skipRequest = skipRequest);
  public getLastRequestTime = () => this.lastRequestTime;
  public getUrl = () => this._url;
  public setUrl = (url: string) => {
    this._url = url;
    this.setEndpoint(url);
  };
}

interface GqlControl {
  client: GQLClient;
  setUrl: (url: string) => void;
  setSkipRequest: (skipRequest: SkipRequest) => void;
}

const GqlContext = createRegisteredContext<GqlControl>(
  'gql-context',
  {} as any
);

const { Provider } = GqlContext;

interface ApiProviderProps {
  url: string;
  skipRequest?: (documentNode: DocumentNode) => boolean;
}

export const GqlProvider: FC<PropsWithChildren<ApiProviderProps>> = ({
  url,
  skipRequest,
  children,
}) => {
  const clientRef = useRef(
    new GQLClient(url, { credentials: 'include' }, skipRequest)
  );

  const setSkipRequest = (
    skipRequest: (documentNode: DocumentNode) => boolean
  ) => {
    clientRef.current.setSkipRequest(skipRequest);
  };

  const setUrl = (url: string) => {
    clientRef.current.setUrl(url);
  };

  const val = {
    setSkipRequest,
    setUrl,
    client: clientRef.current,
  };

  return <Provider value={val}>{children}</Provider>;
};

export const useGql = (): GqlControl => {
  const graphQLClientControl = React.useContext(GqlContext);
  return graphQLClientControl;
};
