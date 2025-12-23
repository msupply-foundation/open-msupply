import React, { FC } from 'react';
import {
  BasicSpinner,
  Box,
  createQueryParamsStore,
  ModalTabs,
  QueryParamsProvider,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import {
  CustomerSearchModal,
  NameRowFragment,
  useName,
} from '@openmsupply-client/system';

import { NewRequisitionType } from '../../types';
import {
  NewProgramRequisition,
  ProgramRequisitionOptions,
} from './ProgramRequisitionOptions';
import { useResponse } from '../api';

export interface NewGeneralRequisition {
  type: NewRequisitionType.General;
  name: NameRowFragment;
}

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    newRequisition: NewGeneralRequisition | NewProgramRequisition
  ) => void;
}
export const CreateRequisitionModalComponent: FC<
  CreateRequisitionModalProps
> = ({ isOpen, onClose, onCreate }) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: false });
  const { data, isLoading } = useName.document.customers();
  const customerIds = data?.nodes?.map(c => c.id) || [];
  const { data: hasCustomerPrograms } =
    useResponse.utils.hasCustomerProgramRequisitionSettings(
      customerIds,
      !isLoading
    );
  const [customer, setCustomer] = React.useState<NameRowFragment | null>(null);

  const programTab = React.useMemo(
    () => ({
      Component: (
        <ProgramRequisitionOptions
          customerOptions={data?.nodes ?? []}
          onCreate={onCreate}
          onChangeCustomer={setCustomer}
          customer={customer}
        />
      ),
      value: t('label.requisition-program'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.nodes, onCreate, customer]
  );

  const generalTab = React.useMemo(
    () => ({
      Component: (
        <GeneralRequisition
          onCreate={onCreate}
          open={isOpen}
          onClose={onClose}
        />
      ),
      value: t('label.requisition-general'),
    }),
    [onCreate, isOpen, onClose, t]
  );

  const InnerComponent = React.useMemo(() => {
    if (isLoading) return <BasicSpinner />;
    if (hasCustomerPrograms) {
      return <ModalTabs tabs={[programTab, generalTab]} />;
    }
    return (
      <GeneralRequisition onCreate={onCreate} open={isOpen} onClose={onClose} />
    );
  }, [
    isLoading,
    onCreate,
    isOpen,
    onClose,
    programTab,
    generalTab,
    hasCustomerPrograms,
  ]);

  return (
    <Modal
      height={700}
      width={700}
      slideAnimation={false}
      title={t('label.new-requisition')}
    >
      {InnerComponent}
    </Modal>
  );
};

const GeneralRequisition = ({
  onCreate,
  open,
  onClose,
}: {
  onCreate: (props: NewGeneralRequisition) => void;
  open: boolean;
  onClose: () => void;
}) => (
  <Box paddingTop={2}>
    <CustomerSearchModal
      onChange={name => onCreate({ type: NewRequisitionType.General, name })}
      open={open}
      onClose={onClose}
      isList={true}
    />
  </Box>
);

export const CreateRequisitionModal: FC<
  CreateRequisitionModalProps
> = props => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<NameRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <CreateRequisitionModalComponent {...props} />
  </QueryParamsProvider>
);
