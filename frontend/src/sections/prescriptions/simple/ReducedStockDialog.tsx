import { For, Show } from 'solid-js';
import { roundedText, t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Button } from '@/ui/elements/buttons/Button';
import { AlertTriangleIcon } from '@/ui/icons';
import type { MedicineCard, Shortfall } from './simpleDispensingLogic';

/*
 * Less stock than the list holds (spec/prescriptions ui-surface S9): shown by
 * Dispense when someone took the stock since the amounts were pressed.
 * Nothing is saved until staff choose. A plain Dialog rather than
 * ConfirmDialog, because with every line gone there is nothing to dispense
 * and Go back must stand alone.
 */
export const ReducedStockDialog = (props: {
  short: readonly Shortfall[];
  /** The card a line's medicine came from — its name and unit. */
  cardOf: (itemId: string) => MedicineCard | undefined;
  /** Whether anything is left to dispense once the lines are reduced. */
  canDispense: boolean;
  onDispense: () => void;
  onGoBack: () => void;
}) => (
  <Dialog
    open
    onClose={() => props.onGoBack()}
    icon={<AlertTriangleIcon />}
    testId="reduced-stock-modal"
    title={t('heading.less-stock-available')}
    description={
      <ul>
        <For each={props.short}>
          {line => {
            const card = () => props.cardOf(line.itemId);
            const item = () => card()?.item.name ?? '';
            const unit = () => card()?.item.unitName ?? '';
            return (
              <li data-testid={`reduced-line-${line.itemId}`}>
                <Show
                  when={line.available > 0}
                  fallback={t('messages.line-removed', { item: item() })}
                >
                  {t('messages.line-reduced', {
                    item: item(),
                    wanted: roundedText(line.wanted),
                    available: roundedText(line.available),
                    unit: unit(),
                  }).replace(/\s+/g, ' ')}
                </Show>
              </li>
            );
          }}
        </For>
      </ul>
    }
    actions={
      <>
        <Button
          variant="secondary"
          confirms="cancel"
          data-testid="dialog-button-cancel"
          onClick={() => props.onGoBack()}
        >
          {t('button.go-back')}
        </Button>
        <Show when={props.canDispense}>
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            onClick={() => props.onDispense()}
          >
            {t('button.dispense-reduced')}
          </Button>
        </Show>
      </>
    }
  />
);
