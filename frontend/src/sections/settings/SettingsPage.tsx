import type { Component } from 'solid-js';
import { t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';

// Settings (spec/chrome § utility destinations, AC-CH12): a minimal routed
// page — the nav label as the breadcrumb leaf, the running build's version in
// the app bar's end area, and the empty state as the body until real settings
// content is specced.
const SettingsPage: Component = () => (
  <Page
    header={
      <Header>
        <Breadcrumb crumbs={[{ label: t('settings') }]} />
        <HeaderButtons>
          <LabelledValue label={t('label.app-version')}>
            {APP_VERSION}
          </LabelledValue>
        </HeaderButtons>
      </Header>
    }
  >
    <EmptyState message={t('table.no-results')} />
  </Page>
);

export default SettingsPage;
