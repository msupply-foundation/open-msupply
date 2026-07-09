import type { Component } from 'solid-js';
import { t } from '../intl';
import type { LocaleKey } from '../intl';

// A placeholder page for a nav destination — empty for now, labelled so it is
// obvious which entry rendered. A sub-heading (h2), below the store-name h1 the
// shell renders. The title is an i18n key (resolved here, so it re-translates on
// a language switch); it is the destination's own nav label key.
export const EntryPage: Component<{ labelKey: LocaleKey }> = props => (
  <section>
    <h2>{t(props.labelKey)}</h2>
    <p>{t('app.nothing-here')}</p>
  </section>
);
