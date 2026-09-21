// Line arithmetic shared by every surface that reports it. One definition
// because the sign convention is the whole point: the detail table's
// Difference column and the line editor's Difference cell each used to carry
// their own subtraction, with a comment promising the two agreed — and they
// did agree, in the direction OPPOSITE to the reference app (issue #562).

/**
 * The gap between what actually arrived and what the supplier declared they
 * sent, in PACKS.
 *
 * Read against **Packs received**, which is the figure it sits beside and the
 * one the receiver is entering: a POSITIVE difference means more arrived than
 * was declared, a negative one means the delivery fell short.
 *
 * `undefined` where nothing was recorded as shipped — there is nothing to
 * compare against, and a bare `0` there would read as "the two match".
 */
export const packDifference = (
  numberOfPacks: number,
  shippedNumberOfPacks: number | null | undefined
): number | undefined =>
  shippedNumberOfPacks == null
    ? undefined
    : numberOfPacks - shippedNumberOfPacks;
