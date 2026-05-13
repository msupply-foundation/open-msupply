import React, { FC, PropsWithChildren, useRef } from 'react';
import {
  GraphQLClient,
  RequestDocument,
  RequestOptions,
  Variables,
} from 'graphql-request';
import { AuthError, getAuthCookie } from '../authentication/AuthContext';
import { LocalStorage } from '../localStorage';
import { DocumentNode } from 'graphql';
import { RequestConfig } from 'graphql-request/build/esm/types';
import { createRegisteredContext } from 'react-singleton-context';

export type SkipRequest = (documentNode: DocumentNode) => boolean;

// these queries are allowed to fail silently with permission denied errors
// as they are for background data fetches only; the user will be notified
// by other, page-level, queries instead. Allowing the exceptions here
// prevents the display of multiple permission denied errors for a single page
const permissionExceptions = [
  'reports',
  'stockCounts',
  'inboundShipmentCounts',
  'inboundShipmentExternalCounts',
  'outboundShipmentCounts',
  'itemCounts',
  'requisitionCounts',
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
    // returning an empty object in order to give the caller a stable reference
    // without it, the page will re-render continuously
    return response.then(
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
