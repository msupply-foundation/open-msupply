import React from 'react';
import { Footer } from './Footer';

interface PrescriptionLineEditProps {
  itemId: string;
  programId?: string;
}

export const PrescriptionLineEdit: React.FC<PrescriptionLineEditProps> = ({
  itemId,
  programId,
}) => {
  return (
    <>
      <Footer
        isSaving={false} //TODO
        disabled={true} // TODO
        handleSave={async () => {}} //TODO
      />
    </>
  );
};
