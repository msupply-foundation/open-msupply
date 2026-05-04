import React, { FC, PropsWithChildren, useRef } from 'react';
import {
  GraphQLClient,
  RequestDocument,
  RequestOptions,
  Variables,
} from 'graphql-request';
import { getAuthCookie } from '../authentication/AuthContext';
import { DocumentNode } from 'graphql';
import { RequestConfig } from 'graphql-request/build/esm/types';
import { createRegisteredContext } from 'react-singleton-context';

export type SkipRequest = (documentNode: DocumentNode) => boolean;

interface ResponseError {
  message?: string;
  path?: string[];
  extensions?: { details?: string };
}

/**
 * Transport-level failure: no HTTP response was received (offline, DNS,
 * CORS, server unreachable). React Query retries these; the global
 * connection banner watches for them.
 */
export class NetworkError extends Error {
  constructor(public cause?: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
  }
}

/** Token missing/expired/rejected. Drives the re-login modal. */
export class UnauthenticatedError extends Error {
  constructor(public detail?: string) {
    super('Unauthenticated');
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Authenticated but not allowed. `path` is the GraphQL field path,
 * used by the global handler to decide whether to surface a toast.
 */
export class PermissionDeniedError extends Error {
  constructor(
    public detail?: string,
    public path?: string[]
  ) {
    super('Forbidden');
    this.name = 'PermissionDeniedError';
  }
}

/** 4xx-equivalent: client sent something the server rejected. */
export class BadUserInputError extends Error {
  constructor(public detail?: string) {
    super('Bad user input');
    this.name = 'BadUserInputError';
  }
}

/** 5xx-equivalent: backend bug or unexpected state. Reported to Bugsnag. */
export class InternalServerError extends Error {
  constructor(public detail?: string) {
    super(detail ?? 'Internal error');
    this.name = 'InternalServerError';
  }
}

const toTypedGraphqlError = (errors: ResponseError[]): Error => {
  const error = errors[0];
  const detail = error?.extensions?.details ?? error?.message;
  switch (error?.message) {
    case 'Unauthenticated':
      return new UnauthenticatedError(detail);
    case 'Forbidden':
      return new PermissionDeniedError(detail, error?.path);
    case 'Bad user input':
      return new BadUserInputError(detail);
    case 'Internal error':
      return new InternalServerError(detail);
    default:
      return new InternalServerError(detail ?? 'Unknown error');
  }
};

const isTransportFailure = (reason: unknown): boolean => {
  // graphql-request rejects with a ClientError carrying `response` for
  // any HTTP response with a body. Anything else (TypeError from fetch,
  // abort, DNS) reaches us without a response and is a transport failure.
  if (!reason || typeof reason !== 'object') return true;
  if (!('response' in reason) || !(reason as { response: unknown }).response)
    return true;
  return false;
};

class GQLClient extends GraphQLClient {
  private emptyData: object;
  private skipRequest: SkipRequest;
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

    super.setHeader('Authorization', `Bearer ${getAuthCookie().token}`);
    const response = options.document
      ? super.request(options)
      : super.request(
          documentOrOptions as RequestDocument,
          variables,
          requestHeaders
        );
    // returning an empty object on success is to give the caller a stable
    // reference when the response is null/undefined; without it pages
    // re-render continuously.
    return response.then(
      data => (data ?? this.emptyData) as T,
      reason => {
        if (isTransportFailure(reason)) {
          throw new NetworkError(reason);
        }
        const errors = (reason as { response?: { errors?: ResponseError[] } })
          .response?.errors;
        if (errors && errors.length > 0) {
          throw toTypedGraphqlError(errors);
        }
        // HTTP response with no graphql errors body — treat as transport.
        throw new NetworkError(reason);
      }
    );
  }

  public setSkipRequest = (skipRequest: SkipRequest) =>
    (this.skipRequest = skipRequest);
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
