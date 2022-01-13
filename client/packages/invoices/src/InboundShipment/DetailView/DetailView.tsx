import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  Item,
  useEditModal,
} from '@openmsupply-client/common';
import { toItem } from '@openmsupply-client/system';
import { useDraftInbound } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { GeneralTab } from './GeneralTab';
import { InboundLineEdit } from './modals/InboundLineEdit/InboundLineEdit';
import { isInboundEditable } from '../../utils';
import { InvoiceLine, InboundShipmentItem } from '../../types';

export const DetailView: FC = () => {
  const { draft } = useDraftInbound();
  const { onOpen, onClose, mode, entity, isOpen } = useEditModal<Item>();

  const onRowClick = React.useCallback(
    (line: InboundShipmentItem | InvoiceLine) => {
      const item = toItem(line);
      onOpen(item);
    },
    [onOpen]
  );

  if (!draft) return null;

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isInboundEditable(draft)}
        onAddItem={() => onOpen()}
      />

      <Toolbar draft={draft} />

      <GeneralTab onRowClick={onRowClick} />

      <Footer />
      <SidePanel />

      {isOpen && (
        <InboundLineEdit
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
          item={entity}
        />
      )}
    </TableProvider>
  );
};
