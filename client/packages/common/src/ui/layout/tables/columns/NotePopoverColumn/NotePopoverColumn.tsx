import React from 'react';
import { DomainObject } from '@common/types';
import { ColumnAlign, ColumnDefinition } from '../types';
import { MessageSquareIcon } from '@common/icons';
import { PaperPopover, PaperPopoverSection } from '@common/components';
import { useTranslation } from '@common/intl';
import { isProduction } from '@common/utils';

interface ObjectWithNote {
  note: string;
}

const isObjectWithANote = (
  variableToCheck: unknown
): variableToCheck is ObjectWithNote =>
  (variableToCheck as ObjectWithNote).note !== undefined;

export const getNotePopoverColumn = <T extends DomainObject>(
  label?: string
): ColumnDefinition<T> => ({
  key: 'note',
  sortable: false,
  align: ColumnAlign.Center,
  width: 60,
  accessor: ({ rowData }) => {
    if (isObjectWithANote(rowData)) {
      return rowData.note;
    } else {
      if (!isProduction()) {
        // TODO: Bugsnag during prod
        throw new Error(`
        The default accessor for the note popover column has been called with a row
        that does not have a note field.
        Have you forgotten to provide a custom accessor to return a value? i.e.
        { ...getNotePopoverColumn(), accessor: ({rowData}) => rowData.comment }
        `);
      } else {
        return '';
      }
    }
  },
  Header: () => {
    return null;
  },

  Cell: ({ column, rowData, rows }) => {
    const t = useTranslation('common');
    const value = column.accessor({ rowData, rows });

    return value ? (
      <PaperPopover
        width={400}
        height={180}
        Content={
          <PaperPopoverSection label={label ?? t('label.notes')}>
            {String(value)}
          </PaperPopoverSection>
        }
      >
        <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
      </PaperPopover>
    ) : null;
  },
});
