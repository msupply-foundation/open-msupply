import React from 'react';
import {
  Box,
  Divider,
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  ModalRow,
  MaterialTable,
  useSimpleMaterialTable,
} from '@openmsupply-client/common';
import { StockItemSearchInput } from '@openmsupply-client/system/src';
import { DraftGoodsReceivedLine } from '../../api/hooks/useGoodsReceivedLine';
import { PatchDraftLineInput } from '../../api/hooks/useDraftGoodsReceivedLines';
import { useGoodsReceivedLineEditColumns } from './columns';

export type GoodsReceivedLineItem = Partial<DraftGoodsReceivedLine>;

export interface GoodsReceivedLineEditProps {
  draft?: DraftGoodsReceivedLine | null;
  draftLines: DraftGoodsReceivedLine[];
  addDraftLine: () => void;
  updateDraftLine: (patch: PatchDraftLineInput) => void;
  removeDraftLine: (id: string) => void;
}

export const GoodsReceivedLineEdit = ({
  draft,
  draftLines,
  addDraftLine,
  updateDraftLine,
  removeDraftLine,
}: GoodsReceivedLineEditProps) => {
  const t = useTranslation();
  const showContent = !!draft;

  const columns = useGoodsReceivedLineEditColumns({
    updateDraftLine,
    removeDraftLine,
  });

  const table = useSimpleMaterialTable<DraftGoodsReceivedLine>({
    tableId: 'goods-received-line-edit',
    columns,
    data: draftLines,
  });

  return (
    <>
      <ModalRow>
        <StockItemSearchInput
          autoFocus={!draft}
          openOnFocus={!draft}
          disabled={true} // Only used to edit existing lines
          currentItemId={draft?.itemId}
          onChange={() => {}}
        />
        <Box flex={1} justifyContent="flex-start" display="flex" my={2}>
          <ButtonWithIcon
            onClick={addDraftLine}
            color="primary"
            variant="outlined"
            label={`${t('label.add-batch')} (+)`}
            Icon={<PlusCircleIcon />}
          />
        </Box>
        <Divider margin={10} />
      </ModalRow>
      {showContent && (
        <Box
          sx={{
            py: 2,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'divider',
            borderRadius: 5,
            width: '100%',
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          <MaterialTable table={table} />
        </Box>
      )}
    </>
  );
};
