import { type Component } from 'solid-js';
import { t } from '@/intl';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '@/ui/layout/Form/FormColumns';
import { FormColumn } from '@/ui/layout/Form/FormColumn';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import type { PurchaseOrderFieldEdit } from '../purchaseOrderEdit';

export interface PurchaseOrderDetailsTabProps {
  /**
   * True once the order is Sent or Finalised — every field here goes with it.
   */
  disabled: boolean;
  edit: PurchaseOrderFieldEdit;
}

/*
 * The Details tab (spec/purchase-orders S8): the order's correspondence fields,
 * in two columns of labelled field rows — no section titles, no footer, no
 * action of its own. The tab is fields alone.
 *
 * Every field here is enabled and disabled AS ONE (rules § what may be
 * changed, and when): the whole tab closes when the order is Sent or
 * Finalised.
 */
export const PurchaseOrderDetailsTab: Component<
  PurchaseOrderDetailsTabProps
> = props => (
  // The screen's body is full-bleed for its line table, so this form supplies
  // its own edge padding and reading cap (ui-standards/detail-views.md § the
  // sectioned edit form — "the form tab padded, table tabs filled"). `wide`,
  // because columns of short fields is the dense-form case, and a narrower
  // minWidth per column so they stay side by side while the side panel is
  // open.
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
        />
        <TextField
          label={t('label.authorising-officer-2')}
          value={props.edit.state.authorisingOfficer2}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('authorisingOfficer2', e.currentTarget.value)
          }
        />
        <TextArea
          label={t('label.additional-instructions')}
          value={props.edit.state.additionalInstructions}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('additionalInstructions', e.currentTarget.value)
          }
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
        />
        <TextField
          label={t('label.heading-message')}
          value={props.edit.state.headingMessage}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('headingMessage', e.currentTarget.value)
          }
        />
        <TextArea
          label={t('label.freight-condition')}
          value={props.edit.state.freightConditions}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('freightConditions', e.currentTarget.value)
          }
        />
      </FormColumn>
    </FormColumns>
  </ContentContainer>
);
