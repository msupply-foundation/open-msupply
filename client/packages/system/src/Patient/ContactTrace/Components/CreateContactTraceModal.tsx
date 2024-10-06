import React, { FC, useState } from 'react';
import {
  DialogButton,
  InputWithLabelRow,
  RouteBuilder,
  useDialog,
  useNavigate,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import {
  PatientModal,
  usePatientModalStore,
  DocumentRegistryFragment,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { ContactTraceSearchInput } from './ContactTraceSearchInput';
import { usePatient } from '../../api';

export const CreateContactTraceModal: FC = () => {
  const patientId = usePatient.utils.id();
  const t = useTranslation();
  const { current, setModal: selectModal } = usePatientModalStore();
  const [traceRegistry, setTraceRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();
  const navigate = useNavigate();

  const reset = () => {
    selectModal(undefined);
    setTraceRegistry(undefined);
  };

  const { Modal } = useDialog({
    isOpen: current === PatientModal.ContactTraceSearch,
    onClose: reset,
  });

  const onChangeContactTrace = (entry: DocumentRegistryFragment) => {
    setTraceRegistry(entry);
  };

  const canSubmit = () => traceRegistry !== undefined;

  return (
    <Modal
      title={t('label.new-contact-trace')}
      cancelButton={<DialogButton variant="cancel" onClick={reset} />}
      okButton={
        <DialogButton
          variant={'ok'}
          disabled={!canSubmit()}
          onClick={async () => {
            if (traceRegistry !== undefined) {
              navigate(
                RouteBuilder.create(AppRoute.Dispensary)
                  .addPart(AppRoute.ContactTrace)
                  .addPart('new')
                  .addQuery({
                    type: traceRegistry.documentType,
                    patient: patientId,
                  })
                  .build()
              );
            }
            reset();
          }}
        />
      }
      width={700}
    >
      <React.Suspense fallback={<div />}>
        <InputWithLabelRow
          label={t('label.contact-tracing-type')}
          Input={
            <ContactTraceSearchInput
              onChange={onChangeContactTrace}
              width={250}
            />
          }
        />
      </React.Suspense>
    </Modal>
  );
};
