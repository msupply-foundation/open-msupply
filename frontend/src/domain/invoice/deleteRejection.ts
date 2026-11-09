import type { GraphqlErrorItem } from '@/api/graphql';
import { rejectionFrom, type Rejection } from '@/api/rejection';
import { t } from '@/intl';

// Why deleting an invoice was refused, for the verticals whose delete cascades
// through the invoice's lines — inbound shipments and customer returns (both
// stock-in), and supplier returns (stock-out).
//
// The shared untyped-refusal reader (api/rejection) handles the ordinary shape:
// a bare variant name in `extensions.details` translates, anything multi-line is
// a debug dump and stays behind a disclosure. This adds the one case it cannot
// know about.
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

export type DeleteRejection = Rejection;

export const deleteRejection = (errors: GraphqlErrorItem[]): DeleteRejection =>
  rejectionFrom(errors, t('messages.cant-delete-generic'), detail =>
    LINE_LOCK_VARIANTS.find(variant => detail.includes(variant))
  );
