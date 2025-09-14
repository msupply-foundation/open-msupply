import React, { FC } from 'react';
import { RecordWithId } from '@common/types';
import { ColumnAlign, ColumnDefinition } from '../types';
import { MessageSquareIcon } from '@common/icons';
import { PaperHoverPopover, PaperPopoverSection } from '@common/components';
import { useTranslation } from '@common/intl';
import { EnvUtils } from '@common/utils';

interface NoteObject {
  header: string;
  body: string;
}

const NoteSection: FC<{ header: string; body: string }> = ({
  header,
  body,
}) => {
  return (
    <>
      <b>{header}</b>
      <span>{body}</span>
    </>
  );
};

const hasRequiredFields = (
  variableToCheck: unknown
): variableToCheck is NoteObject =>
  (variableToCheck as NoteObject).header !== undefined &&
  (variableToCheck as NoteObject).body !== undefined;

export const getNotePopoverColumn = <T extends RecordWithId>(
  label?: string
): ColumnDefinition<T> => ({
  key: 'note',
  sortable: false,
  align: ColumnAlign.Center,
  width: 60,
  accessor: ({ rowData }) => {
    if (hasRequiredFields(rowData)) {
      return rowData;
    } else {
      if (!EnvUtils.isProduction()) {
        // TODO: Bugsnag during prod
        throw new Error(`
        The default accessor for the note popover column has been called with row data
        that does not have the fields 'header' and 'body'.

        This column requires the fields 'header' and 'body' to be present in the row data to render
        correctly.

        Have you forgotten to provide a custom accessor to return the right value? i.e.
        [ getNotePopoverColumn(), { accessor: ({rowData}) => ({header: rowData.batch, body: rowData.note}) }]
        `);
      } else {
        return { header: '', body: '' };
      }
    }
  },
  Header: () => {
    return null;
  },

  Cell: ({ column, rowData }) => {
    const t = useTranslation();
    const value = column.accessor({ rowData });

    let content: NoteObject[] = value as NoteObject[];
    if (!Array.isArray(value)) {
      content = [value as NoteObject];
    }

    return value ? (
      <PaperHoverPopover
        width={400}
        Content={
          <PaperPopoverSection label={label ?? t('label.notes')}>
            {content.map(({ header, body }) => (
              <NoteSection key={body} {...{ header, body }} />
            ))}
          </PaperPopoverSection>
        }
      >
        <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
      </PaperHoverPopover>
    ) : null;
  },
});
