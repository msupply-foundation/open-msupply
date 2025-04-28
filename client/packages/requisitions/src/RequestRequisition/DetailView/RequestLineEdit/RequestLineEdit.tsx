import React, { ReactElement } from 'react';
import { useTranslation } from '@common/intl';
import {
  ItemRowFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import {
  Box,
  FnUtils,
  InsertRequestRequisitionLineInput,
  TextArea,
  usePluginProvider,
  useWindowDimensions,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { Footer } from './Footer';
import { RequestFragment, RequestLineFragment } from '../../api';
import { AccordionPanelSection } from '@openmsupply-client/invoices/src/Prescriptions/LineEditView/PanelSection';
import { OrderSection } from './Sections';
import { DetailsSection } from './Sections/DetailsSection';

interface RequestLineEditProps {
  item?: ItemRowFragment | null;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  save?: () => void;
  hasNext: boolean;
  next: ItemRowFragment | null;
  hasPrevious: boolean;
  previous: ItemRowFragment | null;
  isProgram: boolean;
  lines: RequestLineFragment[];
  requisition: RequestFragment;
  insert: (patch: InsertRequestRequisitionLineInput) => void;
  scrollIntoView: () => void;
  disabled?: boolean;
}

export const RequestLineEdit = ({
  draft,
  update,
  save,
  hasNext,
  next,
  hasPrevious,
  previous,
  isProgram,
  lines,
  requisition,
  insert,
  scrollIntoView,
  disabled: isSent,
}: RequestLineEditProps): ReactElement => {
  const t = useTranslation();
  const { plugins } = usePluginProvider();
  const { width } = useWindowDimensions();

  const key = draft?.id ?? 'new';
  const isNew = !draft?.id;
  const isPacksEnabled = !!draft?.defaultPackSize;
  const line = lines.find(line => line.id === draft?.id);
  const { id: requisitionId } = requisition;

  return (
    <Box display="flex" flexDirection="column" padding={2} gap={1}>
      <AccordionPanelSection
        key={`${key}_item_search`}
        title={t('label.item', { count: 1 })}
        closedSummary={draft?.itemName}
        defaultExpanded={isNew && !isSent}
      >
        <StockItemSearchInput
          onChange={(newItem: ItemRowFragment | null) => {
            if (newItem) {
              insert({
                id: FnUtils.generateUUID(),
                requisitionId: requisitionId,
                itemId: newItem.id,
              });
            }
          }}
          extraFilter={item => !lines.some(line => line.item.id === item.id)}
        />
      </AccordionPanelSection>
      <AccordionPanelSection
        key={`${key}_order`}
        title={t('title.order')}
        defaultExpanded={!isNew && !isSent}
      >
        <OrderSection
          disabled={isSent}
          isPacksEnabled={isPacksEnabled}
          draft={draft}
          update={update}
        />
      </AccordionPanelSection>
      <AccordionPanelSection
        key={`${key}_details`}
        title={t('label.details')}
        defaultExpanded={true}
      >
        <DetailsSection
          isProgram={isProgram}
          draft={draft}
          update={update}
          save={save}
          plugins={plugins}
          isPacksEnabled={isPacksEnabled}
          disabled={isSent}
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
          disabled={isSent}
        />
      </AccordionPanelSection>
      <Box paddingTop={1} maxHeight={200} width={width * 0.48} display="flex">
        {line &&
          plugins.requestRequisitionLine?.editViewInfo?.map((Info, index) => (
            <Info key={index} line={line} requisition={requisition} />
          ))}
      </Box>
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionId={draft?.requisitionId}
          scrollIntoView={scrollIntoView}
        />
      </Box>
    </Box>
  );
};
