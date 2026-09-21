import { type Component } from 'solid-js';
import { t } from '@/intl';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '@/ui/layout/Form/FormColumns';
import { FormColumn } from '@/ui/layout/Form/FormColumn';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { CurrencyField } from '@/ui/elements/inputs/CurrencyField';
import type { PurchaseOrderInfoFragment } from '../purchaseOrderDetail.generated';
import type {
  PurchaseOrderFieldEdit,
  PurchaseOrderPatch,
} from '../purchaseOrderEdit';

export interface PurchaseOrderDetailsTabProps {
  node: PurchaseOrderInfoFragment;
  /**
   * True once the order is Sent or Finalised — every field here goes with it.
   */
  disabled: boolean;
  edit: PurchaseOrderFieldEdit;
  onSaveField: (patch: PurchaseOrderPatch) => void;
}

/*
 * The Details tab (spec/purchase-orders S8): the order's correspondence fields
 * and its five additional charges, in three columns of labelled field rows —
 * no section titles, no footer, no action of its own. The tab is fields alone.
 *
 * Every field here is enabled and disabled AS ONE (rules § what may be
 * changed, and when): the whole tab closes when the order is Sent or
 * Finalised. What the charges do to the order's cost is the side panel's —
 * they are summed there and added to the final cost, and reach neither stored
 * total (purchaseOrderPricing.ts).
 */
export const PurchaseOrderDetailsTab: Component<
  PurchaseOrderDetailsTabProps
> = props => {
  // The charges are saved on blur rather than through the shared text buffer:
  // a number field's value is committed by NumberField's own gate, so there is
  // no keystroke burst to coalesce.
  const saveCharge = (
    field:
      | 'agentCommission'
      | 'documentCharge'
      | 'communicationsCharge'
      | 'insuranceCharge'
      | 'freightCharge',
    value: number | undefined
  ) => props.onSaveField({ [field]: value ?? 0 });

  const currency = () => props.node.currency?.code;

  return (
    // The screen's body is full-bleed for its line table, so this form supplies
    // its own edge padding and reading cap (ui-standards/detail-views.md § the
    // sectioned edit form — "the form tab padded, table tabs filled"). `wide`,
    // because three columns of short fields is the dense-form case, and a
    // narrower minWidth per column so the three stay side by side while the
    // side panel is open rather than dropping the charges to full width.
    <ContentContainer size="wide" padded onFocusOut={() => props.edit.flush()}>
      <FormColumns>
        <FormColumn minWidth="15rem">
          <TextField
            label={t('label.authorising-officer-1')}
            value={props.edit.state.authorisingOfficer1}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField('authorisingOfficer1', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
          <TextField
            label={t('label.authorising-officer-2')}
            value={props.edit.state.authorisingOfficer2}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField('authorisingOfficer2', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
          <TextArea
            label={t('label.additional-instructions')}
            value={props.edit.state.additionalInstructions}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField(
                'additionalInstructions',
                e.currentTarget.value
              )
            }
            onBlur={() => props.edit.flush()}
          />
        </FormColumn>

        <FormColumn minWidth="15rem">
          <TextField
            label={t('label.supplier-agent')}
            value={props.edit.state.supplierAgent}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField('supplierAgent', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
          <TextField
            label={t('label.heading-message')}
            value={props.edit.state.headingMessage}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField('headingMessage', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
          <TextArea
            label={t('label.freight-condition')}
            value={props.edit.state.freightConditions}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField('freightConditions', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
        </FormColumn>

        {/* The five additional charges. Each is a nullable Float on the wire
          and an absent charge counts as zero in the panel's sum, so clearing
          one writes 0 rather than leaving the old figure standing. */}
        <FormColumn minWidth="15rem">
          <CurrencyField
            label={t('label.agent-commission')}
            currency={currency()}
            value={props.node.agentCommission ?? undefined}
            disabled={props.disabled}
            onChange={value => saveCharge('agentCommission', value)}
          />
          <CurrencyField
            label={t('label.document-charge')}
            currency={currency()}
            value={props.node.documentCharge ?? undefined}
            disabled={props.disabled}
            onChange={value => saveCharge('documentCharge', value)}
          />
          <CurrencyField
            label={t('label.communication-charge')}
            currency={currency()}
            value={props.node.communicationsCharge ?? undefined}
            disabled={props.disabled}
            onChange={value => saveCharge('communicationsCharge', value)}
          />
          <CurrencyField
            label={t('label.insurance-charge')}
            currency={currency()}
            value={props.node.insuranceCharge ?? undefined}
            disabled={props.disabled}
            onChange={value => saveCharge('insuranceCharge', value)}
          />
          <CurrencyField
            label={t('label.freight-charge')}
            currency={currency()}
            value={props.node.freightCharge ?? undefined}
            disabled={props.disabled}
            onChange={value => saveCharge('freightCharge', value)}
          />
        </FormColumn>
      </FormColumns>
    </ContentContainer>
  );
};
