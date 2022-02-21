import React, { FC } from 'react';
import {
  styled,
  TabPanel,
  useColumns,
  Box,
  HeaderCell,
  alpha,
  Checkbox,
  BasicTextInput,
  useTranslation,
  Column,
  RecordPatch,
} from '@openmsupply-client/common';
import { DraftStocktakeLine } from './hooks';
import { StocktakeLineFragment } from '../../../api';

interface StocktakeLinePanelProps {
  value: string;
  batches: DraftStocktakeLine[];
  update: (patch: RecordPatch<DraftStocktakeLine>) => void;
}

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

const StyledTabContainer = styled(Box)(() => ({
  height: 300,
  flexDirection: 'row',
  display: 'flex',
}));

const StyledStaticArea = styled(Box)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.menu, 0.4),
  width: 300,
  display: 'flex',
  flexDirection: 'column',
}));

export const StocktakeLinePanel: FC<StocktakeLinePanelProps> = ({
  value,
  batches,
  children,
  update,
}) => {
  const t = useTranslation();
  const [selectionColumn, batchColumn] = useColumns([
    { key: 'count', label: 'label.count-this-line', width: 200 },
    ['batch', { width: 100 }],
  ]) as [Column<StocktakeLineFragment>, Column<StocktakeLineFragment>];

  return (
    <StyledTabPanel value={value}>
      <StyledTabContainer>
        {!!batches.length && (
          <StyledStaticArea>
            <Box minHeight="40px" display="flex" alignItems="center">
              <HeaderCell dense column={selectionColumn} />
              <HeaderCell dense column={batchColumn} />
            </Box>

            {batches.map((line, index) => {
              const { id, batch, countThisLine } = line;
              return (
                <Box
                  flexDirection="row"
                  display="flex"
                  alignItems="center"
                  key={id}
                >
                  <Box
                    minHeight="42px"
                    paddingLeft="16px"
                    paddingRight="16px"
                    width="125px"
                    display="flex"
                    flexDirection="row"
                    alignItems="center"
                  >
                    <Checkbox
                      key={id}
                      checked={countThisLine}
                      onClick={() =>
                        update({
                          id: line.id,
                          countThisLine: !countThisLine,
                        })
                      }
                    />
                    <Box width={100}>{`${t('label.line', {
                      line: index + 1,
                    })}`}</Box>
                  </Box>

                  <Box
                    flexDirection="row"
                    display="flex"
                    alignItems="center"
                    paddingLeft="16px"
                    paddingRight="16px"
                  >
                    <BasicTextInput
                      value={batch}
                      onChange={e =>
                        update({ id: line.id, batch: e.target.value })
                      }
                    />
                  </Box>
                </Box>
              );
            })}
          </StyledStaticArea>
        )}
        {children}
      </StyledTabContainer>
    </StyledTabPanel>
  );
};
