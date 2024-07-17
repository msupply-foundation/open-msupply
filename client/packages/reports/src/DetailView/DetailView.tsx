import React, { useEffect } from 'react';
import { NothingHere, useBreadcrumbs } from '@openmsupply-client/common';
import { useDisplayReport, useReportStore } from '@openmsupply-client/system';
import { Environment } from '@openmsupply-client/config';

export const DetailView = () => {
  const { id, args, name } = useReportStore();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { data: fileId } = useDisplayReport({
    reportId: id,
    args,
  });
  const url = `${Environment.FILE_URL}${fileId}`;

  useEffect(() => {
    setCustomBreadcrumbs({ 0: name ?? '' });
  }, [name, setCustomBreadcrumbs]);

  return fileId ? <iframe src={url} width="100%" /> : <NothingHere />;
};
