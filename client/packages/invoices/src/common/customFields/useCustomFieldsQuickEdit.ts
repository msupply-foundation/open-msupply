import { useRef } from 'react';
import { DraftProperties } from '@openmsupply-client/common';

/**
 * Builds the `onUpdate` handler for {@link InvoiceToolbarCustomFields} in views
 * whose local draft/buffered state replaces top-level keys wholesale (the
 * Returns toolbars). Each quick-edit patch is a single key, so it needs two
 * different shapes on the way out:
 *
 * - `customFields`: the whole current blob with the patch merged in, for the
 *   view's local state — writing the bare patch there would blank every other
 *   prominent field in the toolbar.
 * - `patch`: only the keys quick-edited so far, for the update mutation — the
 *   server merge-patches `customFields`, matching the other invoice toolbars.
 *   Patches accumulate across calls because the views' trailing debounce only
 *   fires the last mutation, which would otherwise drop the first of two rapid
 *   edits to different fields.
 */
export const useCustomFieldsQuickEdit = (
  customFields: Record<string, unknown> | null | undefined,
  update: (data: {
    customFields: Record<string, unknown>;
    patch: DraftProperties;
  }) => void
) => {
  const accumulated = useRef<DraftProperties>({});

  return (patch: DraftProperties) => {
    accumulated.current = { ...accumulated.current, ...patch };
    update({
      customFields: { ...customFields, ...patch },
      patch: accumulated.current,
    });
  };
};
