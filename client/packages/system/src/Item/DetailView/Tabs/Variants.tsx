import React, { useState } from 'react';
import {
  MasterListRowFragment,
  useMasterList,
} from '@openmsupply-client/system';
import {
  AppBarButtonsPortal,
  BasicSpinner,
  BasicTextInput,
  ButtonWithIcon,
  InputWithLabelRow,
  NothingHere,
} from '@common/components';
import {
  DataTable,
  TableProvider,
  useColumns,
  createTableStore,
  Box,
  createQueryParamsStore,
  TooltipTextCell,
  useTranslation,
  PlusCircleIcon,
} from '@openmsupply-client/common';

export const ItemVariantsTab = ({ itemId }: { itemId?: string }) => {
  const t = useTranslation();
  const [state, setState] = useState<any>({});

  return (
    <>
      <AppBarButtonsPortal>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          onClick={() => {}}
          label={t('label.add-variant')}
        />
      </AppBarButtonsPortal>
      <Box justifyContent="center" display="flex" flex={1} paddingTop={3}>
        <Box>
          <InputWithLabelRow
            Input={
              <BasicTextInput
                value={state.name ?? ''}
                onChange={event => {
                  setState({ name: event.target.value });
                }}
              />
            }
            label={t('label.name')}
          />
        </Box>
        <Box>
          <TableProvider
            createStore={createTableStore}
            queryParamsStore={createQueryParamsStore({
              initialSortBy: { key: 'name' },
            })}
          >
            <ItemPackagingVariantsTable itemId={itemId} />
          </TableProvider>
        </Box>
      </Box>
    </>
  );
};
const ItemPackagingVariantsTable = ({ itemId }: { itemId?: string }) => {
  const { data, isLoading } = useMasterList.document.listByItemId(itemId ?? '');
  const t = useTranslation();
  const columns = useColumns<MasterListRowFragment>([
    // ['level', { Cell: TooltipTextCell }],
    ['name', { width: 200, Cell: TooltipTextCell }],
    ['description', { minWidth: 100, Cell: TooltipTextCell }],
  ]);

  if (isLoading) return <BasicSpinner />;

  return (
    <DataTable
      id="item-variant-packaging"
      data={data?.nodes}
      columns={columns}
      noDataElement={<NothingHere body={t('error.no-master-list')} />}
    />
  );
};
