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

interface NewGeneralRequisition {
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

  const { data, isLoading } = useName.document.customers();

  const [customer, setCustomer] = React.useState<NameRowFragment | null>(null);

  const handleCustomerChange = (customer: NameRowFragment | null) => {
    setCustomer(customer);
  };

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: false });

  const InnerComponent = () => {
    if (isLoading) return <BasicSpinner />;
    if (data && data.totalCount > 0)
      return (
        <ModalTabs
          tabs={[
            {
              Component: (
                <ProgramRequisitionOptions
                  customerOptions={data.nodes ?? []}
                  onCreate={onCreate}
                  onChangeCustomer={handleCustomerChange}
                  customer={customer}
                />
              ),
              value: t('label.requisition-program'),
            },
            {
              Component: (
                <GeneralRequisition
                  onCreate={onCreate}
                  open={isOpen}
                  onClose={onClose}
                />
              ),
              value: t('label.requisition-general'),
            },
          ]}
        />
      );
    return (
      <GeneralRequisition onCreate={onCreate} open={isOpen} onClose={onClose} />
    );
  };

  return (
    <Modal
      height={700}
      width={700}
      slideAnimation={false}
      title={t('label.new-requisition')}
    >
      <InnerComponent />
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
