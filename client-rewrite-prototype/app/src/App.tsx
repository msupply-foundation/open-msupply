import { Sidebar } from '@/components/Sidebar/Sidebar';
import { Footer } from '@/components/Footer/Footer';
import styles from './App.module.css';

export const App = () => {
  return (
    <div className={styles.shell}>
      <Sidebar activeSectionId="distribution" selectedId="outbound" />
      <main className={styles.main}>
        <div className={styles.placeholder}>
          <h1>Outbound Shipments</h1>
          <p>
            Component storybook — we&apos;ll build each element of this page one
            at a time. So far: the navigation sidebar and the app footer. Pick a
            language marked <strong>RTL</strong> from the footer to flip the
            whole UI.
          </p>
        </div>
        <Footer />
      </main>
    </div>
  );
};
