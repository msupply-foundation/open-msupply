import React, {
  Dispatch,
  ReactElement,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from '@common/intl';
import {
  ItemRowFragment,
  ItemWithStatsFragment,
  StockItemSearchInput,
  useItemById,
} from '@openmsupply-client/system';
import {
  Box,
  TextArea,
  usePluginProvider,
  useWindowDimensions,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { RequestFragment, RequestLineFragment } from '../../api';
import { AccordionPanelSection } from '@openmsupply-client/invoices/src/Prescriptions/LineEditView/PanelSection';
import { Details, Order } from './Sections';

interface RequestLineEditProps {
  item?: ItemRowFragment | null;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  previous: ItemRowFragment | null;
  isProgram: boolean;
  lines: RequestLineFragment[];
  requisition: RequestFragment;
  setCurrentItem: Dispatch<SetStateAction<ItemWithStatsFragment | undefined>>;
  disabled?: boolean;
}

export const RequestLineEdit = ({
  draft,
  update,
  isProgram,
  lines,
  requisition,
  setCurrentItem,
  disabled,
}: RequestLineEditProps): ReactElement => {
  const t = useTranslation();
  const { plugins } = usePluginProvider();
  const { width } = useWindowDimensions();
  const [itemId, setItemId] = useState<string>();
  const { data } = useItemById(itemId);

  const key = draft?.id ?? 'new';
  const isNew = !draft?.id;
  const isPacksEnabled = !!draft?.defaultPackSize;
  const line = lines.find(line => line.id === draft?.id);

  const handleChange = (newItem: ItemRowFragment | null) => {
    if (newItem) setItemId(newItem.id);
  };

  useEffect(() => {
    if (data) setCurrentItem(data);
  }, [data, setCurrentItem]);

  return (
    <Box display="flex" flexDirection="column" padding={2} gap={1}>
      <AccordionPanelSection
        key={`${key}_item_search`}
        title={t('label.item', { count: 1 })}
        closedSummary={draft?.itemName}
        defaultExpanded={!disabled}
      >
        <StockItemSearchInput
          currentItemId={draft?.itemId}
          onChange={handleChange}
          disabled={disabled}
          extraFilter={item => !lines.some(line => line.item.id === item.id)}
        />
      </AccordionPanelSection>
      <AccordionPanelSection
        key={`${key}_order`}
        title={t('title.order')}
        defaultExpanded={!isNew}
      >
        <Order
          disabled={disabled}
          isPacksEnabled={isPacksEnabled}
          draft={draft}
          update={update}
        />
      </AccordionPanelSection>
      <AccordionPanelSection
        key={`${key}_details`}
        title={t('label.details')}
        defaultExpanded={!isNew}
      >
        <Details
          isProgram={isProgram}
          draft={draft}
          update={update}
          plugins={plugins}
          isPacksEnabled={isPacksEnabled}
          disabled={disabled}
        />
      </AccordionPanelSection>
      <AccordionPanelSection
        key={`${key}_comment`}
        title={t('label.comment')}
        defaultExpanded={false}
      >
        <TextArea
          value={draft?.comment ?? ''}
          onChange={e => update({ comment: e.target.value })}
          disabled={disabled}
        />
      </AccordionPanelSection>
      <Box paddingTop={1} maxHeight={200} width={width * 0.48} display="flex">
        {line &&
          plugins.requestRequisitionLine?.editViewInfo?.map((Info, index) => (
            <Info key={index} line={line} requisition={requisition} />
          ))}
      </Box>
    </Box>
  );
};
