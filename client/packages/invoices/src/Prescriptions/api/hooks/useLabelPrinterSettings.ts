import { useGql, useQuery } from 'packages/common/src';
import { getSdk } from '../operations.generated';
import { PRINTER_SETTINGS } from './keys';

//duplicate of settings label printer - to be updated when new printer settings are finished and make reuseable then
export const useLabelPrinterSettingsGraphQl = () => {
  const { client } = useGql();
  const printerSettingsApi = getSdk(client);

  return { printerSettingsApi };
};

export const useLabelPrinterSettings = () => {
  const { printerSettingsApi } = useLabelPrinterSettingsGraphQl();

  const queryKey = [PRINTER_SETTINGS];

  const queryFn = async () => {
    const result = await printerSettingsApi.labelPrinterSettings({});
    return result.labelPrinterSettings;
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
