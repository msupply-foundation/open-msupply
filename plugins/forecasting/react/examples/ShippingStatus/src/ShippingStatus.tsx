import React from 'react';
import {
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  ThemeProviderProxy,
  InvoiceNode,
  useDialog,
  DialogButton,
  Box,
  BasicSpinner,
  Typography,
  useIntl,
  LocaleKey,
} from '@openmsupply-client/common';

const ShowTracking = ({ data }: { data: InvoiceNode }) => {
  const t = useTranslation('plugin');
  const { Modal, showDialog, hideDialog, open } = useDialog();
  const [loading, setLoading] = React.useState(false);
  const { i18n } = useIntl();

  i18n.addResourceBundle('en', 'plugin', {
    'heading.show-shipping-status': 'Show Shipping Status',
  });

  React.useEffect(() => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
    }, 5000);
  }, [open]);

  return (
    <ThemeProviderProxy>
      <ButtonWithIcon
        Icon={<PlusCircleIcon />}
        label={t('button.view')}
        onClick={showDialog}
        color="primary"
      />
      <Modal
        title={t('heading.show-shipping-status' as LocaleKey)}
        width={500}
        height={200}
        okButton={
          <DialogButton disabled={loading} variant="ok" onClick={hideDialog} />
        }
      >
        <Box padding={2}>
          <Typography sx={{ fontWeight: 'bold' }} component="div">
            ID: {data.id}
          </Typography>
          {!loading ? (
            <Typography component="div">No status available</Typography>
          ) : (
            <Box sx={{ height: 50 }}>
              <BasicSpinner />
            </Box>
          )}
        </Box>
      </Modal>
    </ThemeProviderProxy>
  );
};

export default ShowTracking;
