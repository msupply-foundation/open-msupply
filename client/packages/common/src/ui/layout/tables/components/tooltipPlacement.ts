import { noOtherVariants } from '@common/utils';
import { ColumnAlign } from '../columns';

/**
 * Returns tooltip placement depending on the column alignment, e.g. to have the tooltip on the
 * correct side of the column.
 */
export const tooltipPlacement = (
  align: ColumnAlign
): 'bottom-end' | 'bottom-start' | 'bottom' => {
  switch (align) {
    case ColumnAlign.Left:
      return 'bottom-start';
    case ColumnAlign.Right:
      return 'bottom-end';
    case ColumnAlign.Center:
      return 'bottom';
    default:
      return noOtherVariants(align);
  }
};
