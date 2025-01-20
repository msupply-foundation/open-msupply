import React, {FC, useState} from "react"
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
  BasicTextInput,
  DateTimePickerInput,
  DateUtils
} from "@openmsupply-client/common";
import { SimpleLabelDisplay } from '../../Components/SimpleLabelDisplay'
import { useAssets } from '../../../Equipment/api';
import { Status } from "packages/coldchain/src/Equipment/Components";

const ChevronUpIcon = (): JSX.Element => {
  return (
    <ChevronDownIcon sx={{
      transform: 'rotate(-180deg)'
    }} />
  )
}

const Section = ({
  children,
  heading,
}: {
  children: React.ReactNode;
  heading: string;
}) => (
  <Box
    display="flex"
    flexDirection="column"
    padding={1}
    sx={{ maxWidth: '400px', width: '100%', gap: 1 }}
  >
    <Heading>{heading}</Heading>
    {children}
  </Box>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: 'bold',
    }}
  >
    {children}
  </Typography>
);

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
  })

  if (isLoading) return <DetailFormSkeleton />;

  if (!data) return <h1>{t('error.asset-not-found')}</h1>

  const toggleCollapse = (tab: "summary" | "details" | "statusHistory" | "documents" | "log") => (
    setIsOpen((prev) => {
      return {
        ...prev,
        [tab]: !prev[tab].valueOf()
      }
    })
  );  

  return (
      <Box sx={{
          width: '100%',
          flex: 1,
          padding: '.5em'
      }}>
        <Box sx={{
          width: '100%',
          minHeight: '50px',
          display: 'flex',
          padding: '.75rem',
        }}>
            <ButtonWithIcon
              shouldShrink={false}
              label={"Print QR code"}
              onClick={() => {}}
              Icon={<PrinterIcon />}
            />
        </Box>
        <Box sx={{
          padding: '.25rem .75rem',
        }}>
          <SimpleLabelDisplay
            label="Manufacturer"
            value={data.catalogueItem?.manufacturer || "n/a"}
          />
          <SimpleLabelDisplay
            label="Type"
            value={data.assetType?.name || "n/a"}
          />
        </Box>
        <Box sx={{padding: ".2rem"}}>
          <Status status={data.statusLog?.status} />
        </Box>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: "10px",
          borderTopLeftRadius: "10px",
        }}>
          <Typography sx={{            
            fontSize: "0.875rem",
            fontWeight: 'bold',
          }}>
            {t("label.summary")}
          </Typography>
          <IconButton
            icon={isOpen.summary ? <ChevronUpIcon /> : <ChevronDownIcon />}
            label=""
            onClick={() => {toggleCollapse("summary")}}
          />
        </Box>
        <Collapse in={isOpen.summary} sx={{
          background: theme.palette.background.white,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}> 
          <Section heading={t('heading.asset-identification')}>
            <BasicTextInput
              value={data.assetCategory?.name ?? ''}
              label={t('label.category')}  
              disabled            
              fullWidth
              
            />
            <BasicTextInput              
              value={data.assetType?.name ?? ''}
              label={t('label.type')}
              disabled                
              fullWidth
            />
            <BasicTextInput              
              value={data.serialNumber ?? ''}
              label={t('label.serial')}
              fullWidth
            />
            <BasicTextInput
              value={data.assetNumber ?? ''}
              label={t('label.asset-number')}
              fullWidth
            />
            <DateTimePickerInput              
              format="P"              
              value={DateUtils.getDateOrNull()}
              textFieldProps={{ fullWidth: true }}
              onChange={() => {}}
              label={t('label.installation-date')}
            />
            <DateTimePickerInput              
              format="P"              
              value={DateUtils.getDateOrNull()}
              textFieldProps={{ fullWidth: true }}
              onChange={() => {}}
              label={t('label.replacement-date')}
            />
            <DateTimePickerInput              
              format="P"              
              value={DateUtils.getDateOrNull()}
              textFieldProps={{ fullWidth: true }}
              onChange={() => {}}
              label={t('label.warranty-start-date')}
            />
            <DateTimePickerInput              
              format="P"              
              value={DateUtils.getDateOrNull()}
              textFieldProps={{ fullWidth: true }}
              onChange={() => {}}
              label={t('label.warranty-end-date')}
            />
          </Section>
          <Section heading={t('heading.cold-chain')}>
            <BasicTextInput              
              value={"Cold Storage Location Autocomplete"}
              label={t('label.cold-storage-location')}
              fullWidth
            />
          </Section>
          <Section heading={t('heading.functional-status')}>
            <BasicTextInput              
              value={"Functional status things here"}
              label={t('label.cold-storage-location')}
              fullWidth
            />
          </Section>    
            
        </Collapse>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: "10px",
          borderTopLeftRadius: "10px",
        }}>
          <Typography sx={{            
            fontSize: "0.875rem",
            fontWeight: 'bold',
          }}>
            {t("label.details")}
          </Typography>
          <IconButton
            icon={isOpen.details ? <ChevronUpIcon /> : <ChevronDownIcon />}
            label=""
            onClick={() => {toggleCollapse("details")}}
          />
        </Box>
        <Collapse in={isOpen.details} sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}>
            <h1>Details data here</h1>
        </Collapse>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: "10px",
          borderTopLeftRadius: "10px",
        }}>
          <Typography sx={{            
            fontSize: "0.875rem",
            fontWeight: 'bold',
          }}>
            {t("label.statushistory")}
          </Typography>
          <IconButton
            icon={isOpen.statusHistory ? <ChevronUpIcon /> : <ChevronDownIcon />}
            label=""
            onClick={() => {toggleCollapse("statusHistory")}}
          />
        </Box>
        <Collapse in={isOpen.statusHistory} sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}>
            <h1>Status History data here</h1>
        </Collapse>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: "10px",
          borderTopLeftRadius: "10px",
        }}>
          <Typography sx={{            
            fontSize: "0.875rem",
            fontWeight: 'bold',
          }}>
            {t("label.documents")}
          </Typography>
          <IconButton
            icon={isOpen.documents ? <ChevronUpIcon /> : <ChevronDownIcon />}
            label=""
            onClick={() => {toggleCollapse("documents")}}
          />
        </Box>
        <Collapse in={isOpen.documents} sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}>
            <h1>Documents data here</h1>
        </Collapse>

        <Box sx={{
          display: 'flex',          
          justifyContent: 'space-between',
          alignItems: 'center',
          background: theme.palette.background.drawer,
          padding: '.25rem .75rem',
          marginTop: '.5rem',
          borderTopRightRadius: "10px",
          borderTopLeftRadius: "10px",
        }}>
          <Typography sx={{            
            fontSize: "0.875rem",
            fontWeight: 'bold',
          }}>
            {t("label.log")}
          </Typography>
          <IconButton
            icon={isOpen.log ? <ChevronUpIcon /> : <ChevronDownIcon />}
            label=""
            onClick={() => {toggleCollapse("log")}}
          />
        </Box>
        <Collapse in={isOpen.log} sx={{
          background: theme.palette.background.drawer,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}>
            <h1>Log data here</h1>
        </Collapse>
      </Box>

  )
}

