import { noOtherVariants } from '@common/utils';
import { ColumnAlign } from '../columns';

/**
 * Returns tooltip placement depending on the column alignment, e.g. to have the tooltip on the
 * correct side of the column.
 */
export const tooltipPlacement = (
  align: ColumnAlign
): 'top-end' | 'top-start' | 'top' => {
  switch (align) {
    case ColumnAlign.Left:
      return 'top-start';
    case ColumnAlign.Right:
      return 'top-end';
    case ColumnAlign.Center:
      return 'top';
    default:
      return noOtherVariants(align);
  }
};
