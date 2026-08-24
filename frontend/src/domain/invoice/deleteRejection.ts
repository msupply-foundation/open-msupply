import type { GraphqlErrorItem } from '@/api/graphql';
import { t } from '@/intl';
import { translateServerError } from '@/intl/intlUtils';

// Why deleting an invoice was refused, for the verticals whose delete cascades
// through the invoice's lines — inbound shipments and customer returns (both
// stock-in), and supplier returns (stock-out).
//
// A per-LINE lock reaches the client as `LineDeleteError { line_id, error: <the
// line's own variant> }`, and every one of those mutations maps THAT to an
// internal error whose message is the bare string "Internal error" (server
// graphql/invoice → the three delete.rs files, `LineDeleteError =>
// InternalError`). The reason survives only in
// `extensions.details`, as a multi-line Rust pretty-debug dump rather than the
// bare identifier the other untyped rejections carry, so it has to be recovered
// by finding the inner variant name in the dump.
//
// Ordered widest-cause-first; each has a `server-error.*` translation. Only
// the stock-in locks appear: deleting a stock-OUT line restores its packs, so
// it has no equivalent lock to hit.
//
// Those translations are written about the RECORD, not the line, even though
// the server's variant names say "Line…". This path is the only reader of them
// (a line delete shows the server's typed `error.description` instead), and it
// is only ever reached by deleting a whole shipment or return — so "a line
// arrived through a stock transfer" named something the user was not acting on
// and could not act on. `linked_invoice_id` is set on a line only by the
// transfer processors, so a line-lock of that kind means the RECORD arrived as
// a transfer (server service/src/processors/transfer/invoice/).
const LINE_LOCK_VARIANTS = [
  'BatchIsReserved',
  'LineUsedInStocktake',
  'LineLinkedToTransferredInvoice',
  'CannotDeleteLinesOfAuthorisedReceivedInvoice',
] as const;

export interface DeleteRejection {
  /** The reason, translated when the server named one we recognise. */
  message: string;
  /** The raw server text, when it came as a debug dump instead of a reason. */
  detail?: string;
}

export const deleteRejection = (
  errors: GraphqlErrorItem[]
): DeleteRejection => {
  const detail = errors[0]?.extensions?.details;
  if (typeof detail === 'string' && detail.length > 0) {
    const lineLock = LINE_LOCK_VARIANTS.find(variant =>
      detail.includes(variant)
    );
    if (lineLock) return { message: translateServerError(lineLock) };
    // A single-line detail is the bare variant name and translates; anything
    // multi-line is a debug dump, which is not user copy — show the generic
    // refusal and tuck the raw text behind a disclosure instead.
    if (!detail.includes('\n'))
      return { message: translateServerError(detail) };
    return { message: t('messages.cant-delete-generic'), detail };
  }
  return {
    message: errors[0]?.message ?? translateServerError('UnknownError'),
  };
};
