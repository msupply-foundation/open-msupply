import { useEffect, useMemo, useState } from 'react';
import {
  FnUtils,
  PropertyV2ParentTableEnum,
  PropertyV2TypeEnum,
} from '@openmsupply-client/common';
import { PropertyV2DetailFragment } from '../api';

export interface DraftProperty {
  id: string;
  name: string;
  type: PropertyV2TypeEnum;
  translationKey: string | null;
  attachedTables: PropertyV2ParentTableEnum[];
  // Stable per-attachment row id, keyed by parent table — needed because the
  // server-side property_table row has its own id distinct from the property id.
  attachmentIds: Partial<Record<PropertyV2ParentTableEnum, string>>;
}

const emptyDraft = (): DraftProperty => ({
  id: FnUtils.generateUUID(),
  name: '',
  type: PropertyV2TypeEnum.Text,
  translationKey: null,
  attachedTables: [],
  attachmentIds: {},
});

const seedDraft = (property: PropertyV2DetailFragment): DraftProperty => ({
  id: property.id,
  name: property.name,
  type: property.type,
  translationKey: property.translationKey ?? null,
  attachedTables: property.attachedTo.map(a => a.table),
  attachmentIds: Object.fromEntries(
    property.attachedTo.map(a => [a.table, a.id])
  ),
});

export const useDraftProperty = (
  seed: PropertyV2DetailFragment | null | undefined
) => {
  const baseline = useMemo(
    () => (seed ? seedDraft(seed) : emptyDraft()),
    [seed?.id]
  );
  const [draft, setDraft] = useState<DraftProperty>(baseline);

  // Re-seed when the underlying property arrives or changes (navigation,
  // post-save reload).
  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);

  const update = (patch: Partial<DraftProperty>) =>
    setDraft(prev => ({ ...prev, ...patch }));

  const toggleAttachedTable = (table: PropertyV2ParentTableEnum) =>
    setDraft(prev => {
      const has = prev.attachedTables.includes(table);
      return {
        ...prev,
        attachedTables: has
          ? prev.attachedTables.filter(t => t !== table)
          : [...prev.attachedTables, table],
        attachmentIds: has
          ? prev.attachmentIds
          : {
              ...prev.attachmentIds,
              [table]: prev.attachmentIds[table] ?? FnUtils.generateUUID(),
            },
      };
    });

  // Shallow comparison against the seeded baseline. Sufficient for the
  // Footer's enabled-state — server is the source of truth on save.
  const isDirty =
    draft.name !== baseline.name ||
    draft.type !== baseline.type ||
    draft.translationKey !== baseline.translationKey ||
    draft.attachedTables.length !== baseline.attachedTables.length ||
    draft.attachedTables.some(t => !baseline.attachedTables.includes(t));

  return { draft, update, toggleAttachedTable, isDirty };
};
