import { createResource, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { CheckIcon } from '../../../ui/icons';
import { NameById, NameProperties } from '../names.generated';
import {
  detailFromResult,
  supplyLevelValue,
  type NameDetail,
  type NamePropertyDef,
} from './nameDetail';
import { NameDetailForm } from './NameDetailForm';

// S3 — Customer detail modal (read-only), opened in place over the Customer list
// (AC-N14, AC-N20). Every field is disabled/read-only; the only footer action is
// Close (AC-N22). Shows the customer's attributes plus its customer-only supply
// level, a v1 name property (AC-N25).

interface Props {
  nameId: string | undefined;
  open: boolean;
  onClose: () => void;
}

type Loaded = { detail: NameDetail | undefined; propDefs: NamePropertyDef[] };

export const CustomerDetailModal: Component<Props> = props => {
  const params = useParams<{ storeId: string }>();

  // Fetch only while open with a selected id — the single-name read (by id) plus
  // the v1 name-property definitions (for the supply-level label/value).
  const [data] = createResource(
    () => (props.open && props.nameId ? props.nameId : undefined),
    async (nameId): Promise<Loaded> => {
      const [nameRes, propsRes] = await Promise.all([
        graphqlFetch(NameById, { storeId: params.storeId, nameId }),
        graphqlFetch(NameProperties, {}),
      ]);
      return {
        detail:
          nameRes.kind === 'success'
            ? detailFromResult(nameRes.data)
            : undefined,
        propDefs:
          propsRes.kind === 'success' ? propsRes.data.nameProperties.nodes : [],
      };
    }
  );

  const detail = () => data.latest?.detail;
  const title = () => detail()?.name ?? t('name.detail.loading');

  return (
    // Title is the record name (accessible name), hidden because the detail
    // form shows a centred record-name header itself (matches the current app,
    // which renders the same Details body inside the modal). Close is the only
    // action (read-only — AC-N22).
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={title()}
      titleHidden
      widthRem={52}
      testId="customer-detail-modal"
      actions={
        // OK dismisses the read-only viewer (matches the current app's modal OK:
        // primary + check icon). Our Button is the brand white-pill primary that
        // fills on hover (design-system choice), not OMS's solid-fill button.
        <Button
          variant="primary"
          icon={<CheckIcon />}
          onClick={props.onClose}
          data-testid="customer-detail-ok"
        >
          {t('common.ok')}
        </Button>
      }
    >
      <Show when={detail()} fallback={<Spinner center />}>
        {name => (
          <NameDetailForm
            name={name()}
            role="customer"
            supplyLevel={supplyLevelValue(
              name().properties,
              data.latest?.propDefs
            )}
          />
        )}
      </Show>
    </Dialog>
  );
};
