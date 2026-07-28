import { Show, type Component } from 'solid-js';
import { t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { ServerInfo } from './support/ServerInfo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/elements/accordion/Accordion';
import {
  CatalogueIcon,
  CustomersIcon,
  PrinterIcon,
  SunIcon,
  SyncIcon,
} from '../../ui/icons';
import { hasPermission } from '../../store/storeContext';
import { isCentralServer } from '../../api/serverInfo';
import { visibleSections, type SettingsAccess } from './sectionVisibility';
import { DisplaySettingsSection } from './display/DisplaySettingsSection';
import styles from './Settings.module.css';
import { SyncSection } from './sync/SyncSection';
import { SupportSection } from './support/SupportSection';
import { DevicesSection } from './devices/DevicesSection';
import { ConfigurationSection } from './configuration/ConfigurationSection';

/*
 * S1 — Settings page (spec/settings/ui-surface.md § S1): a modal-free single
 * page — Page frame, breadcrumb leaf "Settings", body a vertical stack of
 * five collapsible sections in fixed order (Display settings →
 * Synchronisation → Support → Devices → Configuration), SINGLE-open: opening
 * one closes whichever was open. Hidden sections are omitted, not shown
 * disabled (OMS-REG-SET-01.14, -02.11, -03.14, -05.20, -05.23, -05.24) —
 * visibility is a UX convenience; every write is independently checked
 * server-side (spec/settings/rules.md § Access).
 *
 * The app-bar's end-region content here is shared chrome (the version shown
 * via HeaderButtons, as on Help) — not owned by this vertical.
 */
const SettingsPage: Component = () => {
  const access = (): SettingsAccess => ({
    serverAdmin: hasPermission('SERVER_ADMIN'),
    centralServer: isCentralServer(),
  });
  const sections = () => visibleSections(access());
  const visible = (key: ReturnType<typeof visibleSections>[number]) =>
    sections().includes(key);

  return (
    <Page
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('settings') }]} />
          <HeaderButtons>
            {/* Server-info block (issue #500) — the settings-owned mirror of
                the reference's Admin/ServerInfo, which mounts it in the Settings
                app-bar region (always visible), not inside a section. */}
            <ServerInfo />
          </HeaderButtons>
        </Header>
      }
    >
      <ContentContainer size="form" align="start">
        <Accordion collapsible>
          <Show when={visible('display-settings')}>
            <AccordionItem value="display-settings">
              <AccordionTrigger as="h2">
                <span class={styles.sectionHeading}>
                  <SunIcon aria-hidden="true" />
                  {t('heading.settings-display')}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <DisplaySettingsSection />
              </AccordionContent>
            </AccordionItem>
          </Show>
          <Show when={visible('synchronisation')}>
            <AccordionItem value="synchronisation">
              <AccordionTrigger as="h2">
                <span class={styles.sectionHeading}>
                  <SyncIcon aria-hidden="true" />
                  {t('heading.settings-sync')}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <SyncSection />
              </AccordionContent>
            </AccordionItem>
          </Show>
          <Show when={visible('support')}>
            <AccordionItem value="support">
              <AccordionTrigger as="h2">
                <span class={styles.sectionHeading}>
                  <CustomersIcon aria-hidden="true" />
                  {t('heading.support')}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <SupportSection />
              </AccordionContent>
            </AccordionItem>
          </Show>
          <Show when={visible('devices')}>
            <AccordionItem value="devices">
              <AccordionTrigger as="h2">
                <span class={styles.sectionHeading}>
                  <PrinterIcon aria-hidden="true" />
                  {t('heading.devices')}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <DevicesSection />
              </AccordionContent>
            </AccordionItem>
          </Show>
          <Show when={visible('configuration')}>
            <AccordionItem value="configuration">
              <AccordionTrigger as="h2">
                <span class={styles.sectionHeading}>
                  <CatalogueIcon aria-hidden="true" />
                  {t('heading.configuration')}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ConfigurationSection />
              </AccordionContent>
            </AccordionItem>
          </Show>
        </Accordion>
      </ContentContainer>
    </Page>
  );
};

export default SettingsPage;
