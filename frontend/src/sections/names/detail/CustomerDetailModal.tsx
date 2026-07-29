import { createResource, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { OkButton } from '../../../ui/elements/buttons/StandardButtons';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { NameById, NameProperties } from '../names.generated';
import {
  detailFromResult,
  supplyLevelValue,
  type NameDetail,
  type NamePropertyDef,
} from './nameDetail';
import { NameDetailForm } from './NameDetailForm';

// S3 — Customer detail modal (read-only), opened in place over the Customer list
// (AC-N14, AC-N20). Every field is a read-only labelled value and the only
// footer action is OK (AC-N22). Shows the customer's attributes plus its
// customer-only supply level, a v1 name property (AC-N25).

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

  // Read NON-SUSPENDING, gated on `.state`. This resource first fetches on an
  // INTERACTION (opening the modal over the already-open list), and `.latest`
  // alone is not safe there: Solid's `latest` falls back to the suspending read
  // until the resource has resolved once, which would tear down this open
  // native <dialog> (losing its modal backdrop) and the list behind it
  // (kdd/solid-reactivity-pitfalls › no remounts on interaction). `data.loading`
  // stays the spinner boolean.
  const loaded = () =>
    data.state === 'ready' || data.state === 'refreshing'
      ? data.latest
      : undefined;
  const detail = () => loaded()?.detail;
  // The accessible name states which of the three states the viewer is in, so a
  // record that doesn't resolve never reads as "still loading" (detail-views ›
  // states).
  const title = () =>
    detail()?.name ??
    (data.loading ? t('name.detail.loading') : t('error.customer-not-found'));

  return (
    // Title is the record name (accessible name), hidden because the detail
    // form shows a centred record-name header itself (matches the current app,
    // which renders the same Details body inside the modal). OK is the only
    // action (read-only — AC-N22).
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={title()}
      titleHidden
      widthRem={52}
      testId="customer-detail-modal"
      actions={
        // The standard dialog dismiss for a read-only viewer: icon-less OK
        // (D55 — a footer is read as words in a fixed position, so it earns no
        // icon; OK stays the label where nothing is being saved, detail-views ›
        // modal detail). The shared dialog-OK id (the current app's DialogButton
        // emits the same), so the cross-FE suite locates OK by one id.
        <OkButton onClick={props.onClose} data-testid="dialog-button-ok" />
      }
    >
      <Show
        when={detail()}
        fallback={
          // Spinner while the read is in flight; once it has settled with no
          // record, say so rather than spinning forever (detail-views › states).
          <Show when={!data.loading} fallback={<Spinner center />}>
            <EmptyState
              title={t('error.customer-not-found')}
              message={t('messages.customer-not-found')}
            />
          </Show>
        }
      >
        {name => (
          <NameDetailForm
            name={name()}
            role="customer"
            supplyLevel={supplyLevelValue(
              name().properties,
              loaded()?.propDefs
            )}
          />
        )}
      </Show>
    </Dialog>
  );
};
