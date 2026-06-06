import { GraphQLClient } from 'graphql-request';
import {
  LocaleKey,
  TypedTFunction,
  UserPermission,
} from '@openmsupply-client/common';
import { InboundNodeType } from '@common/types';
import { getSdk } from '../api/operations.generated';

export interface IslandFormatters {
  /** Localised number formatting. */
  number: (value?: number | null) => string;
  /** Localised currency formatting (home currency). */
  currency: (value?: number | null) => string;
  /** Localised short date (empty string for null/invalid). */
  date: (value?: string | Date | null) => string;
}

/**
 * Everything the plain-JS island needs from the React shell, passed in once at
 * mount time. The island never imports a React hook - the thin wrapper reads
 * these from context and hands them over.
 */
export interface IslandCtx {
  /** Shared GraphQL client (sets auth header + routes auth errors itself). */
  client: GraphQLClient;
  storeId: string;
  /** Detail view only: external (purchase-order linked) shipment. */
  isExternal: boolean;
  /** Detail view only: invoice id from the route params. */
  invoiceId?: string;
  t: TypedTFunction<LocaleKey>;
  /** react-router navigate, for cross-route navigation (keeps shell in sync). */
  navigate: (to: string) => void;
  userHasPermission: (permission: UserPermission) => boolean;
  formatters: IslandFormatters;
  isRtl: boolean;
  /** Invalidate react-query caches so shell badges (counts) refresh. */
  invalidateShellQueries: (keys: unknown[]) => void;
  /** Detail view: report the loaded invoice number back so the wrapper can set
   *  the breadcrumb (breadcrumbs stay React). */
  onInvoiceLoaded?: (invoiceNumber: number, inboundType: InboundNodeType) => void;
}

export type InboundSdk = ReturnType<typeof getSdk>;

/** Each island owns its own SDK, mirroring useInboundGraphQL. */
export const createSdk = (ctx: IslandCtx): InboundSdk => getSdk(ctx.client);

export interface Island {
  unmount: () => void;
  /** Apply a fresh ctx (e.g. store/locale change) without losing page state. */
  update?: (ctx: IslandCtx) => void;
}
