import React, { useMemo } from 'react';
import {
  useDialog,
  useTranslation,
  ModalMode,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  DataTable,
  InvoiceNodeStatus,
  useIntlUtils,
  InvoiceLineNode,
} from '@openmsupply-client/common';
import { Draft } from '../../..';

import { useHistoryColumns } from './columns';
import { usePrescriptionList } from '../../api';

interface HistoryModalModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Draft | null;
  mode: ModalMode | null;
  patientId: string;
}

export interface HistoryItem {
  id: string;
  itemName: string;
  unitQuantity: number;
  directions: string;
  date: Date | null;
  prescriber: string;
}

export const HistoryModal: React.FC<HistoryModalModalProps> = ({
  isOpen,
  onClose,
  patientId,
}) => {
  const {
    query: { data, isLoading },
  } = usePrescriptionList({
    filterBy: {
      otherPartyId: { equalTo: patientId },
      status: { notEqualTo: InvoiceNodeStatus.New },
    },
    sortBy: { key: 'pickedDatetime', direction: 'desc' },
    first: 20,
  });
  const columns = useHistoryColumns();
  const t = useTranslation();
  const { getLocalisedFullName } = useIntlUtils();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const historyData = useMemo(() => {
    const rawData = data?.nodes;
    if (!rawData) return [];

    const compiled: HistoryItem[] = [];

    rawData.forEach(prescription => {
      const { clinician, pickedDatetime, createdDatetime, lines } =
        prescription;
      compiled.push(
        ...combineCommonLines(lines.nodes as InvoiceLineNode[]).map(line => ({
          id: line.id,
          itemName: line.itemName,
          unitQuantity: line.unitQuantity,
          directions: line.note ?? '',
          date: new Date(pickedDatetime ?? createdDatetime),
          prescriber: getLocalisedFullName(
            clinician?.firstName,
            clinician?.lastName
          ),
        }))
      );
    });

    return compiled;
  }, [data]);

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <Modal title={t('heading.history')} width={1125} height={600}>
        <DataTable
          id="prescription-line-edit"
          columns={columns}
          data={historyData}
          isLoading={isLoading}
          dense
        />
      </Modal>
    </TableProvider>
  );
};

// From a group of lines from a prescription, combines ones for the same item
// (from different batches), adding the amounts.
const combineCommonLines = (lines: InvoiceLineNode[]) => {
  const uniqueItems: Record<
    string,
    InvoiceLineNode & { unitQuantity: number }
  > = {};
  lines.forEach(line => {
    const item = uniqueItems?.[line.item.id];
    if (item) {
      item.unitQuantity += line.numberOfPacks * line.packSize;
    } else {
      uniqueItems[line.item.id] = {
        ...line,
        unitQuantity: line.numberOfPacks * line.packSize,
      };
    }
  });
  return Object.values(uniqueItems);
};
