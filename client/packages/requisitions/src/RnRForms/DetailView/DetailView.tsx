import React, { useCallback, useEffect, useState } from 'react';
import {
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  DetailTabs,
  useBreadcrumbs,
  useParams,
  TableProvider,
  createTableStore,
  RnRFormNodeStatus,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { ContentArea } from './ContentArea';
import { RnRForm, useRnRForm } from '../api';
import { RnRFormLineFragment } from '../api/operations.generated';

export const RnRFormDetailView = () => {
  const { id = '' } = useParams();

  const {
    query: { data, isLoading },
    updateLine: { updateLine },
  } = useRnRForm({ rnrFormId: id });
  const navigate = useNavigate();
  const t = useTranslation('replenishment');

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <RnRFormDetailViewComponent data={data} updateLine={updateLine} />
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.RnRForms)
            .build()
        )
      }
      title={t('error.rnr-not-found')}
      message={t('messages.click-to-return-to-rnr-list')}
    />
  );
};

const RnRFormDetailViewComponent = ({
  data,
  updateLine,
}: {
  data: RnRForm;
  updateLine: (line: RnRFormLineFragment) => Promise<void>;
}) => {
  const t = useTranslation('replenishment');
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const [dirtyLines, setDirtyLines] = useState<string[]>([]);

  const saveLine = useCallback(
    async (line: RnRFormLineFragment) => {
      setDirtyLines(lines => lines.filter(id => id !== line.id));
      updateLine(line);
    },
    [updateLine]
  );

  const markDirty = useCallback(
    (id: string) => setDirtyLines(lines => [...lines, id]),
    [setDirtyLines]
  );

  const tabs = [
    {
      Component: (
        <ContentArea
          periodLength={data.periodLength}
          data={data.lines}
          saveLine={saveLine}
          disabled={data.status === RnRFormNodeStatus.Finalised}
          markDirty={markDirty}
        />
      ),
      value: t('label.details'),
    },
    {
      Component: <ActivityLogList recordId={data.id} />,
      value: t('label.log'),
    },
  ];

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data.periodName });
  }, [setCustomBreadcrumbs, data.periodName]);

  const linesUnconfirmed = data.lines.some(line => !line.confirmed);

  return (
    <>
      <AppBarButtons />
      <TableProvider createStore={createTableStore}>
        <DetailTabs tabs={tabs} />
      </TableProvider>

      <Footer
        rnrFormId={data.id}
        unsavedChanges={dirtyLines.length > 0}
        linesUnconfirmed={linesUnconfirmed}
      />
    </>
  );
};
