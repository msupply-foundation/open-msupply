import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Typography,
  IconButton,
} from '@mui/material';
import { DeleteIcon } from '../../../icons';
import { CardFieldDef } from './types';
import { CardField } from './CardField';

interface DataCardProps<T> {
  item: T;
  fieldDefs: CardFieldDef<T>[];
  disabled: boolean;
  headerLabel?: string;
  onDelete?: () => void;
}

export const DataCard = <T,>({
  item,
  fieldDefs,
  disabled,
  headerLabel,
  onDelete,
}: DataCardProps<T>) => {
  const visibleFields = fieldDefs.filter(f => f.includeField !== false);

  // Group fields by section
  const sections: { section: string | undefined; fields: CardFieldDef<T>[] }[] =
    [];
  let currentSection: string | undefined = undefined;
  let currentFields: CardFieldDef<T>[] = [];

  for (const field of visibleFields) {
    if (field.section !== currentSection && currentFields.length > 0) {
      sections.push({ section: currentSection, fields: currentFields });
      currentFields = [];
    }
    currentSection = field.section;
    currentFields.push(field);
  }
  if (currentFields.length > 0) {
    sections.push({ section: currentSection, fields: currentFields });
  }

  return (
    <Card
      sx={{
        overflow: 'visible',
        width: '100%',
        borderRadius: '16px',
      }}
    >
      <CardContent sx={{ padding: 2, '&:last-child': { paddingBottom: 2 } }}>
        {(headerLabel || onDelete) && (
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            {headerLabel && (
              <Typography variant="subtitle2" fontWeight="bold">
                {headerLabel}
              </Typography>
            )}
            {onDelete && !disabled && (
              <IconButton size="small" onClick={onDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}
        {sections.map(({ section, fields }, sectionIndex) => (
          <React.Fragment key={section ?? sectionIndex}>
            {sectionIndex > 0 && (
              <Divider sx={{ my: 1.5 }}>
                {section && (
                  <Typography variant="caption" color="text.secondary">
                    {section}
                  </Typography>
                )}
              </Divider>
            )}
            <Box
              display="grid"
              gridTemplateColumns="1fr 1fr"
              gap={1.5}
            >
              {fields.map(fieldDef => (
                <CardField
                  key={fieldDef.key}
                  fieldDef={fieldDef}
                  rowData={item}
                  disabled={disabled}
                />
              ))}
            </Box>
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
};
