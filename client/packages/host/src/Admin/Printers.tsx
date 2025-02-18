import React from 'react';

import {
  useTranslation,
  Box,
  ButtonWithIcon,
  PlusCircleIcon,
  EditIcon,
  Typography,
  Grid,
} from '@openmsupply-client/common';

export interface PrinterList {
  id: string;
  description: string;
  address: string;
  port: number;
  labelHeight: number;
  labelWidth: number;
}
export const Printers = () => {
  const t = useTranslation();

  const mockPrinters = [
    {
      id: 'Printer1',
      description: 'Printer description one',
    },
    {
      id: 'Printer2',
      description: 'Printer description two',
    },
    {
      id: 'Printer3',
      description: 'Printer description three',
    },
    {
      id: 'Printer4',
      description: 'Printer description four',
    },
    {
      id: 'Printer5',
      description: 'Printer description five',
    },
    {
      id: 'Printer6',
      description: 'Printer description six',
    },
    {
      id: 'Printer7',
      description: 'Printer description seven',
    },
    {
      id: 'Printer8',
      description: 'Printer description eight',
    },
    {
      id: 'Printer9',
      description: 'Printer description nine',
    },
    {
      id: 'Printer10',
      description: 'Printer description ten',
    },
  ];

  return (
    <Grid display="flex" flexDirection="column" gap={1}>
      <Box
        sx={{
          maxHeight: '280px',
          overflowX: 'hidden',
          marginLeft: '12px',
        }}
      >
        {mockPrinters.map(data => (
          <Typography
            sx={{
              fontSize: 16,
              paddingBottom: 1,
            }}
            component="div"
          >
            {data.description}
          </Typography>
        ))}
      </Box>
      <Grid display="flex" justifyContent="flex-start" gap={1} padding={1}>
        <ButtonWithIcon
          Icon={<EditIcon />}
          label={t('button.configure-printers')}
          variant="outlined"
          onClick={() => {}}
          disabled={false}
        />
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.add-printer')}
          variant="outlined"
          onClick={() => {}}
          disabled={false}
        />
      </Grid>
    </Grid>
  );
};
