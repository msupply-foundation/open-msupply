import { useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useSidebar } from '@/components/Sidebar/useSidebar';
import { useIsNavOverlay } from '@/hooks/useMediaQuery';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { InputsShowcase } from '@/components/showcase/InputsShowcase';
import styles from './App.module.css';

export const App = () => {
  const nav = useSidebar();
  const { closeOverlay } = nav;
  const isNavOverlay = useIsNavOverlay();

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
        <Header isNavOverlay={isNavOverlay} onOpenNav={nav.openOverlay} />
        <div className={styles.body}>
          <InputsShowcase />
        </div>
        <Footer />
      </main>
    </div>
  );
};
