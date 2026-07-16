import { createSignal } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, PlusCircleIcon, XCircleIcon } from '../../../../ui/icons';
import { InsertStocktake } from '../createStocktake.generated';

// The initial (opening-balance) stocktake create action — offered only from
// the list's empty state when the store has NO stocktakes yet (the list flips
// the button label/action on hasStocktake). Unlike the regular create flow
// (CreateStocktakeModal, with Full / Filtered / Blank mode controls), an
// initial stocktake takes NO options: the server generates one line per
// visible stock item for opening balances. So this is a plain action-style
// confirm — a message + Cancel / Create, no mode radios or filters — sending
// isInitialStocktake: true (the ONLY place we set it).
//
// Controlled open/onClose like CreateStocktakeModal (the list owns the toggle).
// On success it navigates to the new stocktake's detail, so there's no in-dialog
// success phase — the page changes. A failed create is surfaced by the global
// unexpected-error modal (graphqlFetch); we drop back to confirm so the dialog
// isn't stuck loading. The once-per-store rejection (InitialStocktakeAlreadyExists)
// can't happen from here — the button is only shown when the store has none —
// so it needs no bespoke handling (it would fall through to the global modal).
export const CreateInitialStocktakeAction = (props: {
  open: boolean;
  onClose: () => void;
}) => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);

  const create = async () => {
    if (creating()) return; // re-entry guard
    setCreating(true);
    const result = await graphqlFetch(InsertStocktake, {
      storeId: params.storeId,
      input: {
        id: crypto.randomUUID(),
        isInitialStocktake: true,
        comment: t('stocktake.create.initial-comment'),
      },
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global error modal already surfaced it;
      // drop back so the dialog isn't left stuck loading.
      setCreating(false);
      return;
    }
    const id = result.data.insertStocktake.id;
    props.onClose();
    navigate(`/${params.storeId}/inventory/stocktakes/${id}`);
  };

  return (
    <Dialog
      open={props.open}
      // Blocking while the create is in flight — no click-outside / Escape
      // until it resolves.
      dismissable={!creating()}
      onClose={props.onClose}
      icon={<PlusCircleIcon />}
      title={t('stocktake.create.initial-title')}
      description={t('stocktake.create.initial-confirm')}
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            disabled={creating()}
            onClick={props.onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="secondary"
            icon={<CheckIcon />}
            loading={creating()}
            onClick={() => void create()}
          >
            {t('stocktake.create.action')}
          </Button>
        </>
      }
    />
  );
};
