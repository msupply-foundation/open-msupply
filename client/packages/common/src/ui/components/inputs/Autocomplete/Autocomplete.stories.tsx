import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { Story } from '@storybook/react';
import { styled } from '@mui/material/styles';
import { Autocomplete } from './Autocomplete';
import { AutocompleteList } from './AutocompleteList';
import { AutocompleteMultiList, AutocompleteOption } from '.';

export default {
  title: 'Inputs/Autocomplete',
  component: Grid,
};

const StyledPaper = styled(Paper)({
  height: 500,
  padding: 10,
  width: 400,
});

const options = Array.from({ length: 100 }).map((_, i) => ({
  id: `${i}`,
  label: `${i}`,
}));

const longOptions = [
  {
    label: 'SAINT JOSEPH MOSCATI (HÔPITAL CATHOLIQUE)',
    id: '1',
  },
  {
    label: 'CAFOP de YAMOUSSOUKRO (INF-LC PUBLIC)',
    id: '2',
  },
  {
    label: 'SAINT VINCENT DE PAUL DE YAMOUSSOUKRO (HÔPITAL PSY',
    id: '3',
  },
  {
    label: 'Lycée BAD de YAMOUSSOUKRO (INF-LC PUBLIC)',
    id: '4',
  },
  {
    label: 'Lycée Mami Adjoua de YAMOUSSOUKRO (INF-LC PUBLIC)',
    id: '5',
  },
  {
    label: 'Lycée Scientifique de YAMOUSSOUKRO (INF-LC PUBLIC)',
    id: '6',
  },
  {
    label: 'Garde Republicaine de YAMOUSSOUKRO (INF-M PUBLIC)',
    id: '7',
  },
  {
    label: 'GSPM de YAMOUSSOUKRO (INF-M PUBLIC)',
    id: '8',
  },
  {
    label: 'Nouvelle Clinique Saint Augustin',
    id: '9',
  },
  {
    label: 'INPHB-CENTRE PUBLIC de YAMASSOUKRO',
    id: '10',
  },
  {
    label: 'Pharmacie Centrale CHR PUBLIC DE YAMOUSSOUKRO',
    id: '11',
  },
  {
    label: 'Dispensation CHR PUBLIC DE YAMOUSSOUKRO',
    id: '12',
  },
  {
    label: 'Caisse CHR PUBLIC DE YAMOUSSOUKRO',
    id: '13',
  },
  {
    label: 'CHU COCODY central  (Main Warehouse)',
    id: '14',
  },
  {
    label: 'Pharmacie Centrale CHU COCODY - ABIDJAN (Main Phar',
    id: '15',
  },
  {
    label: 'Pediatrie CHU COCODY - ABIDJAN (Pediatrics)',
    id: '16',
  },
  {
    label: 'Maternity CHU COCODY - ABIDJAN',
    id: '17',
  },
  {
    label: 'Consultations Externes CHU COCODY',
    id: '18',
  },
  {
    label: 'PRIVE CSCT de YAMOUSSOUKRO (INF-PV)',
    id: '19',
  },
];

// TODO: Currently the styles are broken for this only within storybook
const BasicTemplate: Story = ({ options }) => (
  <Grid container>
    <Grid item>
      <StyledPaper>
        <Typography>Basic autocomplete</Typography>
        <Autocomplete options={options} width="300px" />
      </StyledPaper>
    </Grid>
    <Grid item>
      <StyledPaper>
        <Typography>Auto Width Popper</Typography>
        <Autocomplete options={options} width="300px" autoWidthPopper />
      </StyledPaper>
    </Grid>
    <Grid item>
      <StyledPaper>
        <Typography>Disabled</Typography>
        <Autocomplete
          options={options}
          width="300px"
          disabled
          defaultValue={'95' as AutocompleteOption<string>}
        />
      </StyledPaper>
    </Grid>
  </Grid>
);

const ListTemplate: Story = () => (
  <Grid container>
    <Grid item>
      <StyledPaper>
        <Typography>Autocomplete List</Typography>
        <AutocompleteList options={options} optionKey="label" />
      </StyledPaper>
    </Grid>
  </Grid>
);

const MultiListTemplate: Story = () => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  return (
    <Grid container>
      <Grid item>
        <Paper>
          <Typography fontWeight={700}>
            Multiple Option Autocomplete List
          </Typography>
          <div style={{ paddingBottom: 30 }}>
            <Typography>Selected Ids:</Typography>
            <div>{selectedIds.join(', ')}</div>
          </div>
          <AutocompleteMultiList
            onChange={setSelectedIds}
            options={longOptions}
            filterProperties={['label']}
          />
        </Paper>
      </Grid>
    </Grid>
  );
};

export const Basic = BasicTemplate.bind({});
export const List = ListTemplate.bind({});
export const LongOptions = BasicTemplate.bind({});
export const MultiList = MultiListTemplate.bind({});

Basic.args = { options: options };
LongOptions.args = { options: longOptions, autoWidthPopper: true };
