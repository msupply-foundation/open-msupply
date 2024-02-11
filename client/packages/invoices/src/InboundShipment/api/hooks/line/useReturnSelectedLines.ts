import {
  useTableStore,
  useTranslation,
  useNotification,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useInboundRows } from './useInboundRows';

export const useReturnSelectedLines = (): (() => void) => {
  const { items, lines } = useInboundRows();
  // const { mutateAsync } = useReturnInboundLines();
  const isDisabled = useIsInboundDisabled();
  const t = useTranslation('replenishment');
  const { info } = useNotification();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  const onReturnRenameMe = async () => {
    // TODO
    const lineIds = selectedRows.map(({ id }) => id);
    console.log(lineIds);
    await Promise.resolve()
      // await mutateAsync(selectedRows)
      .catch(err => {
        throw err;
      })
      .then(() => {
        // open modal here? TODO
        // const successSnack = success(deletedMessage);
        // successSnack();
      })
      .catch(err => {
        // cannotReturnSnack();
        console.error(err.message);
      });
  };

  const confirmAndReturn = () => {
    if (selectedRows?.length) {
      if (isDisabled) {
        // show error
      } else onReturnRenameMe();
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-return'));
      selectRowsSnack();
    }
  };

  return confirmAndReturn;
};
