import React, { useEffect } from 'react';
import { NothingHere, useBreadcrumbs } from '@openmsupply-client/common';
import {
  useDisplayReport,
  useReport,
  useReportStore,
} from '@openmsupply-client/system';
import { Environment } from '@openmsupply-client/config';

export const DetailView = () => {
  const { id, args } = useReportStore();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { data } = useReport(id);
  const { data: fileId } = useDisplayReport({
    reportId: id,
    args: args.get(id),
  });

  const url = `${Environment.FILE_URL}${fileId}`;

  useEffect(() => {
    setCustomBreadcrumbs({ 0: data?.name ?? '' });
  }, [data?.name]);

  return fileId ? <iframe src={url} width="100%" /> : <NothingHere />;
};
