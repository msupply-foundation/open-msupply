import React, { useEffect, useState } from 'react';
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
  useConfirmOnLeaving,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { ContentArea } from './ContentArea';
import { RnRForm, useRnRForm } from '../../api';
import { RnRFormLineFragment } from '../../api/operations.generated';

export const RnRFormDetailView = () => {
  const { id = '' } = useParams();

  const {
    query: { data, isLoading },
    updateLine: { updateLine },
  } = useRnRForm({ rnrFormId: id });
  const navigate = useNavigate();
  const t = useTranslation('programs');

  //todo clear on finalise? yah gotta clear on confirm all
  const [dirtyLines, setDirtyLines] = useState<string[]>([]);

  useConfirmOnLeaving(dirtyLines.length > 0);

  const saveLine = async (line: RnRFormLineFragment) => {
    setDirtyLines(lines => lines.filter(id => id !== line.id));
    updateLine(line);
  };

  const markDirty = (id: string) => {
    if (!dirtyLines.includes(id)) setDirtyLines(lines => [...lines, id]);
  };

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <RnRFormDetailViewComponent
      data={data}
      saveLine={saveLine}
      markDirty={markDirty}
    />
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Programs)
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
  saveLine,
  markDirty,
}: {
  data: RnRForm;
  saveLine: (line: RnRFormLineFragment) => Promise<void>;
  markDirty: (id: string) => void;
}) => {
  const t = useTranslation('programs');
  const { setCustomBreadcrumbs } = useBreadcrumbs();

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

      <Footer rnrFormId={data.id} linesUnconfirmed={linesUnconfirmed} />
    </>
  );
};
