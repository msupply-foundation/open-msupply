import React, { useEffect, useState } from 'react';
import {
  BasicSpinner,
  NothingHere,
  useBreadcrumbs,
  useParams,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useGenerateReport, useReport } from '@openmsupply-client/system';
import { Environment } from '@openmsupply-client/config';
import { AppBarButtons } from './AppBarButton';

export const DetailView = () => {
  const { id } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { data } = useReport(id ?? '');
  const { mutateAsync, isLoading } = useGenerateReport();
  const [fileId, setFileId] = useState<string | undefined>();
  const { urlQuery } = useUrlQueryParams();

  useEffect(() => {
    setCustomBreadcrumbs({ 0: data?.name ?? '' });
  }, [data?.name]);

  const report = async () => {
    if (!data) return;

    const reportArgs = urlQuery['reportArgs']
      ? JSON.parse(urlQuery['reportArgs'].toString())
      : undefined;

    const fileId = await mutateAsync({
      reportId: data.id,
      args: reportArgs,
      dataId: '',
    });
    setFileId(fileId);
  };

  useEffect(() => {
    if (id) {
      report();
    }
  }, [id]);

  const url = `${Environment.FILE_URL}${fileId}`;

  if (!data) {
    return <NothingHere />;
  }

  return (
    <>
      {isLoading && <BasicSpinner />}
      {fileId ? (
        <>
          <iframe src={url} width="100%" />
          <AppBarButtons report={data} isDisabled={!!data.argumentSchema} />
        </>
      ) : (
        <NothingHere />
      )}
    </>
  );
};
