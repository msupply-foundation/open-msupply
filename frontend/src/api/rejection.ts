import type { GraphqlErrorItem } from './graphql';
import { translateServerError } from '../intl/intlUtils';

export interface Rejection {
  /** The reason, translated when the server named one we recognise. */
  message: string;
  /** The raw server text, when it came as a debug dump instead of a reason. */
  detail?: string;
}

/*
 * Why an UNTYPED refusal was refused.
 *
 * Most mutations answer a domain refusal in their response union, and that
 * typed member carries its own translated description. A few cannot: where the
 * response union has a single member (DeleteResponse), or where the service
 * maps a nested cause to an internal error, the only refusal channel left is a
 * top-level GraphQL error. Those reach a caller that opted into
 * `returnGraphqlErrors`, and this is how such a caller turns one into copy.
 *
 * The reason lives in `extensions.details`, which the server writes as
 * `format!("{error:#?}")` of its service-error enum. For a unit variant that
 * pretty-debug IS the bare variant name on one line — `CannotEditRnRForm`,
 * `RelocationAlreadyFinalised` — which `server-error.<Variant>` translates
 * directly. A variant carrying data prints as a multi-line struct dump, which
 * is not user copy: those get `generic` as the message and keep the raw text
 * for a disclosure (ui/elements/feedback/ErrorDetails).
 *
 * `recoverVariant` is for the second shape — a caller that knows the dump nests
 * a variant it can name returns that name, and it translates as if it had
 * arrived bare (see domain/invoice/deleteRejection, the only such caller).
 *
 * Only the FIRST error is read: it is the one the refusal is about.
 */
export const rejectionFrom = (
  errors: GraphqlErrorItem[],
  generic: string,
  recoverVariant?: (details: string) => string | undefined
): Rejection => {
  const detail = errors[0]?.extensions?.details;
  if (typeof detail === 'string' && detail.length > 0) {
    const recovered = recoverVariant?.(detail);
    if (recovered) return { message: translateServerError(recovered) };
    if (!detail.includes('\n'))
      return { message: translateServerError(detail) };
    return { message: generic, detail };
  }
  // No details at all: the error's own message is all there is to say, and a
  // backstop for the can't-happen case where there is not even an error.
  return {
    message: errors[0]?.message ?? translateServerError('UnknownError'),
  };
};
