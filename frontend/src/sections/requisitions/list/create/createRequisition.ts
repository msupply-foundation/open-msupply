import { generateUUID } from '@/uuid';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import {
  InsertRequisition,
  InsertProgramRequisition,
} from './createRequisition.generated';

// The create-modal mutations (spec/requisitions S3a / rules › creating a
// requisition). Both creates return the new requisition's id (to navigate to
// it) or a user-facing error; the id is client-generated. Mirrors the
// internal-orders createInternalOrder helpers.

// Default general months-of-stock bounds hard-coded by the create modal
// (contract › creating a requisition: the "one month / none" default is the
// client's, not a server default).
const GENERAL_MIN_MONTHS_OF_STOCK = 0;
const GENERAL_MAX_MONTHS_OF_STOCK = 1;

export type CreateResult =
  | { kind: 'created'; id: string }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

// General create (OMS-FUN-DIS-03.1): sends only id + otherPartyId with the
// default bounds. The picker offers only visible customers, so the typed
// customer rejections (OtherPartyNotACustomer / OtherPartyNotVisible) are
// unreachable in practice; a typed rejection that does arrive surfaces inline
// (ui-standards › action feedback — never the reference's silent fall-through)
// and any transport failure goes through the global unexpected-error modal.
export const createGeneralRequisition = async (
  storeId: string,
  customerId: string
): Promise<CreateResult> => {
  const result = await graphqlFetch(InsertRequisition, {
    storeId,
    input: {
      id: generateUUID(),
      otherPartyId: customerId,
      minMonthsOfStock: GENERAL_MIN_MONTHS_OF_STOCK,
      maxMonthsOfStock: GENERAL_MAX_MONTHS_OF_STOCK,
    },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.insertResponseRequisition;
  if (response.__typename === 'RequisitionNode')
    return { kind: 'created', id: response.id };
  return { kind: 'error', message: t('error.unable-to-create-requisition') };
};

// Program create (OMS-FUN-DIS-03.12): sends the order type + period; the
// resolver fills the rest and pre-populates the master-list lines. Any
// rejection keeps the dialog open showing the error (inline, never silent —
// the reference's no-message path is deliberately not copied; ui-standards ›
// action feedback), so returnGraphqlErrors surfaces the untyped rejections
// (already-exists, missing order type) as an inline generic message rather
// than the global modal. The one typed member, MaxOrdersReachedForPeriod,
// gets its own copy.
export const createProgramRequisition = async (
  storeId: string,
  customerId: string,
  programOrderTypeId: string,
  periodId: string
): Promise<CreateResult> => {
  const result = await graphqlFetch(
    InsertProgramRequisition,
    {
      storeId,
      input: {
        id: generateUUID(),
        otherPartyId: customerId,
        programOrderTypeId,
        periodId,
      },
    },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'success') {
    const response = result.data.insertProgramResponseRequisition;
    if (response.__typename === 'RequisitionNode')
      return { kind: 'created', id: response.id };
    return {
      kind: 'error',
      message: t(
        response.error.__typename === 'MaxOrdersReachedForPeriod'
          ? 'error.max-orders-reached-for-period'
          : 'error.unable-to-create-requisition'
      ),
    };
  }
  if (result.kind === 'graphqlError')
    return { kind: 'error', message: t('error.unable-to-create-requisition') };
  // Forbidden / transport / unexpected already surfaced globally.
  return { kind: 'failed' };
};
