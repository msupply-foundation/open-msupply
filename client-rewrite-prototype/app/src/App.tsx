import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useSidebar } from '@/components/Sidebar/useSidebar';
import { useIsNavOverlay } from '@/hooks/useMediaQuery';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { ContentFooter } from '@/components/ContentFooter/ContentFooter';
import { InputsShowcase } from '@/components/showcase/InputsShowcase';
import { SelectorsShowcase } from '@/components/showcase/SelectorsShowcase';
import { TableShowcase } from '@/components/showcase/TableShowcase';
import { BenchmarkPage } from '@/benchmark/BenchmarkPage';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import type { TabDef } from '@/components/ui/Tabs';
import styles from './App.module.css';

const TABS: TabDef[] = [
  { value: 'inputs', label: 'Inputs' },
  { value: 'selectors', label: 'Selectors' },
  { value: 'table', label: 'Table' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'performance', label: 'Performance' },
];

export const App = () => {
  const nav = useSidebar();
  const { closeOverlay } = nav;
  const isNavOverlay = useIsNavOverlay();
  const [tab, setTab] = useState('inputs');

  // Leaving overlay mode (e.g. rotating to landscape) shouldn't strand an open
  // overlay — close it so the docked nav shows cleanly.
  useEffect(() => {
    if (!isNavOverlay) closeOverlay();
  }, [isNavOverlay, closeOverlay]);

  return (
    <div className={styles.shell}>
      <Sidebar
        nav={nav}
        isOverlay={isNavOverlay}
        activeSectionId="distribution"
        selectedId="outbound"
      />
      <main className={styles.main}>
        <Tabs value={tab} onValueChange={setTab} className={styles.tabs}>
          <Header
            isNavOverlay={isNavOverlay}
            onOpenNav={nav.openOverlay}
            tabs={TABS}
            activeTab={tab}
          />
          <div className={styles.body}>
            <TabPanel value="inputs">
              <InputsShowcase />
            </TabPanel>
            <TabPanel value="selectors">
              <SelectorsShowcase />
            </TabPanel>
            <TabPanel value="table">
              <TableShowcase />
            </TabPanel>
            <TabPanel value="feedback">
              <p className={styles.comingSoon}>
                Feedback — alerts, toasts &amp; the month/year date picker.
                Coming soon.
              </p>
            </TabPanel>
            <TabPanel value="performance">
              <BenchmarkPage />
            </TabPanel>
          </div>
        </Tabs>
        <ContentFooter />
        <Footer />
      </main>
    </div>
  );
};
