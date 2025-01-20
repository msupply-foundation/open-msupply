import React, { FC, useState } from 'react';
import {
  Box,
  ButtonWithIcon,
  PrinterIcon,
  useTranslation,
  DetailFormSkeleton,
  Collapse,
  Typography,
  IconButton,
  ChevronDownIcon,
  useTheme,
} from '@openmsupply-client/common';
import { SimpleLabelDisplay } from '../../Components/SimpleLabelDisplay';
import { useAssets } from '../../../Equipment/api';
import { Status } from 'packages/coldchain/src/Equipment/Components';

const ChevronUpIcon = (): JSX.Element => {
  return (
    <ChevronDownIcon
      sx={{
        transform: 'rotate(-180deg)',
      }}
    />
  );
};

export const EquipmentDetailView: FC = () => {
  const t = useTranslation();
  const theme = useTheme();
  const { data, isLoading } = useAssets.document.get();
  const [isOpen, setIsOpen] = useState({
    summary: false,
    details: false,
    statusHistory: false,
    documents: false,
    log: false,
  });

  if (isLoading) return <DetailFormSkeleton />;

  if (!data) return <h1>{t('error.asset-not-found')}</h1>;

  const toggleCollapse = (
    tab: 'summary' | 'details' | 'statusHistory' | 'documents' | 'log'
  ) =>
    setIsOpen(prev => {
      return {
        ...prev,
        [tab]: !prev[tab].valueOf(),
      };
    });
  console.log(data);

  return (
    <Box
      sx={{
        width: '100%',
        flex: 1,
        padding: '.5em',
      }}
    >
      <Box
        sx={{
          width: '100%',
          minHeight: '50px',
          display: 'flex',
          padding: '.75rem',
        }}
      >
        <ButtonWithIcon
          shouldShrink={false}
          label={'Print QR code'}
          onClick={() => {}}
          Icon={<PrinterIcon />}
        />
      </Box>
      <Box
        sx={{
          padding: '.25rem .75rem',
        }}
      >
        <SimpleLabelDisplay
          label="Manufacturer"
          value={data.catalogueItem?.manufacturer || 'n/a'}
        />
        <SimpleLabelDisplay
          label="Type"
          value={data.assetType?.name || 'n/a'}
        />
      </Box>
      <Box sx={{ padding: '.2rem' }}>
        <Status status={data.statusLog?.status} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: '10px',
          borderTopLeftRadius: '10px',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
        >
          Summary
        </Typography>
        <IconButton
          icon={isOpen.summary ? <ChevronUpIcon /> : <ChevronDownIcon />}
          label=""
          onClick={() => {
            toggleCollapse('summary');
          }}
        />
      </Box>
      <Collapse
        in={isOpen.summary}
        sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}
      >
        <h1>Summary data here</h1>
      </Collapse>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: '10px',
          borderTopLeftRadius: '10px',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
        >
          Details
        </Typography>
        <IconButton
          icon={isOpen.details ? <ChevronUpIcon /> : <ChevronDownIcon />}
          label=""
          onClick={() => {
            toggleCollapse('details');
          }}
        />
      </Box>
      <Collapse
        in={isOpen.details}
        sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}
      >
        <h1>Details data here</h1>
      </Collapse>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: '10px',
          borderTopLeftRadius: '10px',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
        >
          Status History
        </Typography>
        <IconButton
          icon={isOpen.statusHistory ? <ChevronUpIcon /> : <ChevronDownIcon />}
          label=""
          onClick={() => {
            toggleCollapse('statusHistory');
          }}
        />
      </Box>
      <Collapse
        in={isOpen.statusHistory}
        sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}
      >
        <h1>Status History data here</h1>
      </Collapse>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: '10px',
          borderTopLeftRadius: '10px',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
        >
          Documents
        </Typography>
        <IconButton
          icon={isOpen.documents ? <ChevronUpIcon /> : <ChevronDownIcon />}
          label=""
          onClick={() => {
            toggleCollapse('documents');
          }}
        />
      </Box>
      <Collapse
        in={isOpen.documents}
        sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}
      >
        <h1>Documents data here</h1>
      </Collapse>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: '10px',
          borderTopLeftRadius: '10px',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
        >
          Log
        </Typography>
        <IconButton
          icon={isOpen.log ? <ChevronUpIcon /> : <ChevronDownIcon />}
          label=""
          onClick={() => {
            toggleCollapse('log');
          }}
        />
      </Box>
      <Collapse
        in={isOpen.log}
        sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}
      >
        <h1>Log data here</h1>
      </Collapse>
    </Box>
  );
};
