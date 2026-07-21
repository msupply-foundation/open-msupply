import React, { useEffect, useMemo, useState } from 'react';
import {
  useTranslation,
  useNotification,
  useConfirmOnLeaving,
  useConfirmationModal,
  useNonPaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  NothingHere,
  Checkbox,
  CustomFieldNodeDisplayMode,
  CustomFieldNodeValueType,
  Box,
  TabContext,
  ShortTabList,
  Tab,
  AppBarContentPortal,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { CUSTOM_FIELD_SCOPES, scopeSupportsProminent } from './scopes';
import { CustomFieldConfigRowFragment, useCustomFieldConfig } from '../api';

const { Hidden, Visible, Prominent } = CustomFieldNodeDisplayMode;

export const CustomFieldsList = () => {
  const t = useTranslation();
  const { success, error } = useNotification();

  const [activeScope, setActiveScope] = useState(
    CUSTOM_FIELD_SCOPES[0]?.scope ?? 'item'
  );
  // Only holds fields whose mode has been changed away from the server value.
  const [draft, setDraft] = useState<Record<string, CustomFieldNodeDisplayMode>>(
    {}
  );

  const {
    query: { data, isFetching, isError },
    update: { update, isUpdating },
  } = useCustomFieldConfig(activeScope);

  const isDirty = Object.keys(draft).length > 0;

  // Guard route navigation while there are unsaved changes.
  const { setIsDirty } = useConfirmOnLeaving('custom-field-config');
  useEffect(() => setIsDirty(isDirty), [isDirty, setIsDirty]);

  const confirmDiscard = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-discard-custom-field-changes'),
    onConfirm: () => {},
  });

  const serverModeOf = (id: string) =>
    data?.nodes.find(node => node.id === id)?.displayMode;

  const modeOf = (row: CustomFieldConfigRowFragment) =>
    draft[row.id] ?? row.displayMode;

  const setMode = (id: string, mode: CustomFieldNodeDisplayMode) => {
    setDraft(prev => {
      const next = { ...prev };
      // Drop the override once it matches the server again, so isDirty stays true.
      if (serverModeOf(id) === mode) delete next[id];
      else next[id] = mode;
      return next;
    });
  };

  const changeScope = (scope: string) => {
    if (scope === activeScope) return;
    const go = () => {
      setDraft({});
      setActiveScope(scope);
    };
    if (isDirty) confirmDiscard({ onConfirm: go });
    else go();
  };

  const save = async () => {
    const updates = Object.entries(draft).map(
      ([customFieldId, displayMode]) => ({ customFieldId, displayMode })
    );
    if (!updates.length) return;
    try {
      const result = await update(updates);
      if (result?.__typename === 'CustomFieldConnector') {
        success(t('messages.custom-fields-saved'))();
        setDraft({});
      } else {
        error(t('error.failed-to-save-custom-fields'))();
      }
    } catch {
      error(t('error.failed-to-save-custom-fields'))();
    }
  };

  const valueTypeLabel = (valueType: CustomFieldNodeValueType): string => {
    switch (valueType) {
      case CustomFieldNodeValueType.Option:
        return t('label.custom-field-type-option');
      case CustomFieldNodeValueType.Boolean:
        return t('label.custom-field-type-boolean');
      case CustomFieldNodeValueType.Integer:
        return t('label.custom-field-type-integer');
      case CustomFieldNodeValueType.Real:
        return t('label.custom-field-type-real');
      case CustomFieldNodeValueType.Date:
        return t('label.custom-field-type-date');
      case CustomFieldNodeValueType.Text:
      default:
        return t('label.custom-field-type-text');
    }
  };

  const columns = useMemo(
    (): ColumnDef<CustomFieldConfigRowFragment>[] => {
      const cols: ColumnDef<CustomFieldConfigRowFragment>[] = [
        { accessorKey: 'name', header: t('label.name') },
        {
          id: 'type',
          header: t('label.type'),
          accessorFn: row => valueTypeLabel(row.valueType),
        },
        {
          id: 'visible',
          header: t('label.visible'),
          size: 100,
          Cell: ({ row }) => {
            const visible = modeOf(row.original) !== Hidden;
            return (
              <Checkbox
                checked={visible}
                onChange={e =>
                  setMode(row.original.id, e.target.checked ? Visible : Hidden)
                }
              />
            );
          },
        },
      ];

      // Only scopes with a prominent surface (invoice toolbars) get the column.
      if (scopeSupportsProminent(activeScope)) {
        cols.push({
          id: 'prominent',
          header: t('label.prominent'),
          size: 120,
          Cell: ({ row }) => {
            const mode = modeOf(row.original);
            // Prominent is only meaningful for a visible field.
            if (mode === Hidden) return null;
            const prominent = mode === Prominent;
            return (
              <Checkbox
                checked={prominent}
                onChange={e =>
                  setMode(
                    row.original.id,
                    e.target.checked ? Prominent : Visible
                  )
                }
              />
            );
          },
        });
      }

      return cols;
    },
    // Cell closures read `draft`/`data`; column set depends on `activeScope`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, draft, data, activeScope]
  );

  const { table } = useNonPaginatedMaterialTable({
    tableId: `custom-field-config-${activeScope}`,
    columns,
    data: data?.nodes,
    isLoading: isFetching,
    isError,
    enableRowSelection: false,
    noDataElement: <NothingHere body={t('messages.no-custom-fields')} />,
  });

  return (
    <>
      <AppBarButtons onSave={save} isDirty={isDirty} isSaving={isUpdating} />
      {/* Scope tabs live in the toolbar, like other detail/list views. */}
      <AppBarContentPortal sx={{ display: 'flex', flex: 1 }}>
        <TabContext value={activeScope}>
          <ShortTabList
            value={activeScope}
            onChange={(_, scope) => changeScope(scope)}
          >
            {CUSTOM_FIELD_SCOPES.map(({ scope, labelKey }) => (
              <Tab key={scope} value={scope} label={t(labelKey)} />
            ))}
          </ShortTabList>
        </TabContext>
      </AppBarContentPortal>
      {/* The page content area is a flex row, so wrap the table in a single
          full-width flex column so it fills the width. */}
      <Box
        display="flex"
        flexDirection="column"
        flex={1}
        width="100%"
        minHeight={0}
      >
        <MaterialTable table={table} />
      </Box>
    </>
  );
};
