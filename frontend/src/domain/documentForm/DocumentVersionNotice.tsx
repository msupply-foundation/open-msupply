/*
 * The note a record shows when its document was recorded under an earlier
 * schema version (kdd/custom-forms/specs.md § Opening an older document), and
 * the Edit action that leaves an archived form for the current one. Rendered
 * by the screens that mount the document form host, above the form body;
 * nothing for a document on the current version. Each version no form can
 * open, shown as recorded by the fallback renderer, says why.
 */
import { Match, Switch, type JSX } from 'solid-js';
import { t } from '../../intl';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { EditIcon } from '../../ui/icons';
import type { DocumentVersion } from './createDocumentForm';

export interface DocumentVersionNoticeProps {
  version: DocumentVersion;
  onEdit: () => void;
}

export const DocumentVersionNotice = (
  props: DocumentVersionNoticeProps
): JSX.Element => (
  <Switch>
    <Match when={props.version.kind === 'archived' && props.version} keyed>
      {v => (
        <Alert severity="info" testId="document-version-notice">
          {t('messages.document-archived-version', {
            version: String(v.version),
          })}{' '}
          <Button
            size="small"
            variant="secondary"
            icon={<EditIcon />}
            data-testid="document-edit-button"
            onClick={() => props.onEdit()}
          >
            {t('button.edit')}
          </Button>
        </Alert>
      )}
    </Match>
    <Match when={props.version.kind === 'migrated' && props.version} keyed>
      {v => (
        <Alert severity="info" testId="document-version-notice">
          {t('messages.document-migrated-version', {
            version: String(v.version),
          })}
        </Alert>
      )}
    </Match>
    <Match when={props.version.kind === 'unknown'}>
      <Alert severity="warning" testId="document-version-notice">
        {t('messages.document-unknown-version')}
      </Alert>
    </Match>
    <Match when={props.version.kind === 'outOfStep'}>
      <Alert severity="warning" testId="document-version-notice">
        {t('messages.document-form-out-of-step')}
      </Alert>
    </Match>
    <Match when={props.version.kind === 'unavailable'}>
      <Alert severity="warning" testId="document-version-notice">
        {t('messages.document-form-unavailable')}
      </Alert>
    </Match>
  </Switch>
);
