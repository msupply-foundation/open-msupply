import type { Component } from 'solid-js';
import { t } from '@/intl';
import { localisedDate } from '@/intl';
import { SidePanelSection } from '@/ui/layout/SidePanel/SidePanel';
import { SidePanelActions } from '@/ui/layout/SidePanel/SidePanel';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import type { createDebouncedEdit } from '@/domain/debouncedEdit';
import { CopyToClipboardButton } from '@/ui/elements/buttons/CopyToClipboardButton';
import type { RnrFormNode } from './rnrFormUpdate';
import { DeleteRnrFormAction } from './actions/DeleteRnrFormAction';

// The R&R form side panel (spec/rnr-forms/ui-surface.md S3 § side panel;
// src/ui/docs/SIDE_PANEL.md is binding): the read-only identity facts, the two
// buffered editable fields (draft only), and the record actions.

export type RnrHeaderEditFields = { theirReference: string; comment: string };

export const RnrFormSidePanel: Component<{
  storeId: string;
  node: RnrFormNode;
  disabled: boolean;
  edit: ReturnType<typeof createDebouncedEdit<RnrHeaderEditFields>>;
  /** The whole loaded form, for copy-to-clipboard (a read, never gated). */
  fullDocument: () => RnrFormNode | undefined;
}> = props => {
  return (
    <>
      <SidePanelSection
        value="additional-info"
        title={t('heading.additional-info')}
        collapsible
      >
        <FieldRow label={t('label.program-name')}>
          <span>{props.node.programName}</span>
        </FieldRow>
        <FieldRow label={t('label.period')}>
          <span>{props.node.period.name}</span>
        </FieldRow>
        <FieldRow label={t('label.supplier')}>
          <span>{props.node.supplierName}</span>
        </FieldRow>
        <FieldRow label={t('label.created')}>
          <span>{localisedDate(props.node.createdDatetime)}</span>
        </FieldRow>
        <FieldRow label={t('label.reference')}>
          <TextField
            label={t('label.reference')}
            hideLabel
            size="small"
            data-testid="rnr-form-reference-field"
            disabled={props.disabled}
            value={props.edit.state.theirReference}
            onInput={e =>
              props.edit.setField('theirReference', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
        <FieldRow label={t('heading.comment')}>
          <TextArea
            label={t('heading.comment')}
            hideLabel
            data-testid="rnr-form-comment-field"
            disabled={props.disabled}
            value={props.edit.state.comment}
            onInput={e => props.edit.setField('comment', e.currentTarget.value)}
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>
      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          <DeleteRnrFormAction
            storeId={props.storeId}
            node={props.node}
            disabled={props.disabled}
          />
          {/* A read — offered whatever the status (controls › copy to
              clipboard); the node carries the whole form incl. the
              unpaginated line set. */}
          <CopyToClipboardButton load={props.fullDocument} indent={4} />
        </SidePanelActions>
      </SidePanelSection>
    </>
  );
};
