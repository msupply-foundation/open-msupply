import { Show, type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { t } from '@/intl';
import { useUrlTab } from '@/list/urlTab';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { Tabs, TabList, TabPanel, type TabDef } from '@/ui/elements/tabs/Tabs';
import { emptyFilters } from './centralDataLogic';
import { ExportCard } from './ExportCard';
import { createImport, ImportCard } from './ImportCard';
import { ImportPreviewFooter } from './ImportPreviewCard';

// S1 — Import and export (spec/central-data/ui-surface.md), as two tabs.

// Offered only on a standalone central server: the menu entry's gate hides it
// elsewhere and its route redirects (spec/navigation § central administration).
const CentralDataPage: Component = () => {
  // Import is the default, so only Export shows in the address.
  const { tab: activeTab, setTab: setActiveTab } = useUrlTab([
    'import',
    'export',
  ]);
  const tabs = (): TabDef[] => [
    {
      value: 'import',
      label: t('button.import'),
      testId: 'central-data-tab-import',
    },
    {
      value: 'export',
      label: t('button.export'),
      testId: 'central-data-tab-export',
    },
  ];
  // Here, not in the cards, so they survive their tab unmounting.
  const [exportFilters, setExportFilters] = createStore(emptyFilters());
  const importState = createImport();

  return (
    <Tabs value={activeTab()} onValueChange={setActiveTab}>
      <Page
        header={
          <Header>
            <Breadcrumb crumbs={[{ label: t('central-data') }]} />
            <TabList tabs={tabs()} />
          </Header>
        }
        // Pinned, so Import stays in reach; on the Import tab only.
        contentFooter={
          <Show when={activeTab() === 'import' && importState.preview()}>
            {current => (
              <ImportPreviewFooter
                preview={current()}
                busy={importState.busy()}
                downloadingErrors={importState.downloadingErrors()}
                onDownloadErrors={() =>
                  void importState.downloadErrors(current())
                }
                onConfirm={() => void importState.confirm(current())}
              />
            )}
          </Show>
        }
      >
        <ContentContainer size="wide">
          <TabPanel value="import">
            <ImportCard state={importState} />
          </TabPanel>
          <TabPanel value="export">
            <ExportCard filters={exportFilters} setFilters={setExportFilters} />
          </TabPanel>
        </ContentContainer>
      </Page>
    </Tabs>
  );
};

export default CentralDataPage;
