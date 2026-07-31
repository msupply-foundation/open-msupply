import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Button } from '../../../../ui/elements/buttons/Button';

// The recent-stocktake warning gate (spec/internal-orders S6, AC-C5). Shown
// before the create modal opens when the store's warn preference is on and its
// finalised stocktakes within maxAge days cover fewer than minItems distinct
// items. It never blocks creation — Continue proceeds to the modal; Go to
// Stocktakes diverts; Cancel (and every dismiss path) does nothing.

export interface StocktakeWarningDialogProps {
  open: boolean;
  minItems: number;
  maxAge: number;
  onCancel: () => void;
  onContinue: () => void;
  onGoToStocktakes: () => void;
}

export const StocktakeWarningDialog: Component<
  StocktakeWarningDialogProps
> = props => (
  <Dialog
    open={props.open}
    onClose={props.onCancel}
    title={t('heading.are-you-sure')}
    testId="stocktake-warning-modal"
    description={t('warning.insufficient-recent-stocktake-items', {
      minItems: props.minItems,
      maxAge: props.maxAge,
    })}
    actions={
      <>
        <Button
          variant="secondary"
          confirms="cancel"
          onClick={() => props.onCancel()}
        >
          {t('button.cancel')}
        </Button>
        {/* Continuing anyway is the ALTERNATIVE, not the confirm: it claims no
            role, so Enter cannot skip the warning the gate exists to give
            (spec/keyboard KB-E2 — the confirm is the primary below). */}
        <Button
          variant="secondary"
          data-testid="continue-without-stocktake-button"
          onClick={() => props.onContinue()}
        >
          {t('button.continue-without-stocktake')}
        </Button>
        <Button
          confirms="plain"
          data-testid="go-to-stocktakes-button"
          onClick={() => props.onGoToStocktakes()}
        >
          {t('button.go-to-stocktakes')}
        </Button>
      </>
    }
  />
);

export default StocktakeWarningDialog;
