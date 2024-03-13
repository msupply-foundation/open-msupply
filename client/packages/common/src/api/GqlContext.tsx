import React, {
  FC,
  useMemo,
  useCallback,
  PropsWithChildren,
  useRef,
} from 'react';
import {
  GraphQLClient,
  RequestDocument,
  RequestOptions,
  Variables,
} from 'graphql-request';
import { AuthError } from '../authentication/AuthContext';
import { LocalStorage } from '../localStorage';
import { DefinitionNode, DocumentNode, OperationDefinitionNode } from 'graphql';
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
  'invoiceCounts',
  'itemCounts',
  'requisitionCounts',
  'temperatureNotifications',
];

// these queries are not considered to be part of the user's activity
// they occur in the background and should not be used to determine
// if the user has remained active
const ignoredQueries = ['refreshToken', 'syncInfo', 'temperatureNotifications'];

interface ResponseError {
  message?: string;
  path?: string[];
  extensions?: { details?: string };
}

export class StdError extends Error {
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
  throw new StdError(
    details || error?.message || 'Unknown error',
    error?.message
  );
};

const shouldIgnoreQuery = (definitionNode: DefinitionNode) => {
  const operationNode = definitionNode as OperationDefinitionNode;
  if (operationNode.operation !== 'query') return false;

  return ignoredQueries.indexOf(operationNode.name?.value ?? '') !== -1;
};

const shouldSaveRequestTime = (documentNode?: DocumentNode) => {
  return documentNode && !documentNode.definitions.some(shouldIgnoreQuery);
};

class GQLClient extends GraphQLClient {
  private client: GraphQLClient;
  private emptyData: object;
  private skipRequest: SkipRequest;
  private lastRequestTime: Date;

  constructor(
    url: string,
    options?: RequestConfig | undefined,
    skipRequest?: SkipRequest
  ) {
    super(url, options);
    this.client = new GraphQLClient(url, options);
    this.emptyData = {};
    this.skipRequest = skipRequest || (() => false);
    this.lastRequestTime = new Date();
  }

  public request<T, V extends Variables | undefined>(
    documentOrOptions: RequestDocument | RequestOptions<Variables>,
    variables?: V,
    requestHeaders?: RequestInit['headers']
  ): Promise<T> {
    const options = documentOrOptions as RequestOptions<Variables>;
    const document = (documentOrOptions as DocumentNode) || options.document;

    if (this.skipRequest(document)) {
      return new Promise(() => this.emptyData);
    }

    if (shouldSaveRequestTime(document)) this.lastRequestTime = new Date();

    const response = options.document
      ? this.client.request(options)
      : this.client.request(
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

  public setHeaders = (headers: HeadersInit): GraphQLClient =>
    this.client.setHeaders(headers);
  public setHeader = (key: string, value: string): GraphQLClient =>
    this.client.setHeader(key, value);
  public setEndpoint = (value: string): GraphQLClient =>
    this.client.setEndpoint(value);
  public setSkipRequest = (skipRequest: SkipRequest) =>
    (this.skipRequest = skipRequest);
  public getLastRequestTime = () => this.lastRequestTime;
}

interface GqlControl {
  client: GQLClient;
  setHeader: (header: string, value: string) => void;
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
  const client = useRef(
    new GQLClient(url, { credentials: 'include' }, skipRequest)
  ).current;

  const setUrl = useCallback(
    (newUrl: string) => {
      client.setEndpoint(newUrl);
    },
    [client]
  );

  const setHeader = useCallback(
    (key: string, value: string) => {
      client.setHeader(key, value);
    },
    [client]
  );

  const setSkipRequest = useCallback(
    (skipRequest: (documentNode: DocumentNode) => boolean) => {
      client.setSkipRequest(skipRequest);
    },
    [client]
  );

  const val = useMemo(
    () => ({
      client,
      setUrl,
      setHeader,
      setSkipRequest,
    }),
    [client, setUrl, setHeader, setSkipRequest]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useGql = (): GqlControl => {
  const graphQLClientControl = React.useContext(GqlContext);
  return graphQLClientControl;
};
