import { NothingHere, useBreadcrumbs } from '@openmsupply-client/common';
import React, { useEffect, useState } from 'react';
import { FC } from 'react';
import { Immunisation } from '../ProgramView/ProgramView';

// dummy data
const data = {
  name: 'some immunisation name',
};

export const ImmunisationDetailView: FC = () => {
  const { setSuffix } = useBreadcrumbs();

  const draftProgram: Record<string, Immunisation> = {};

  const [draft] = useState(draftProgram);

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [setSuffix]);

  return !!data ? <>{draft}</> : <NothingHere />;
};
