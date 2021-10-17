import React from 'react';
import { Grid } from '@mui/material';
import { Story } from '@storybook/react';
import { ListSearch } from './ListSearch';
import { BaseButton } from '../../buttons';

export default {
  title: 'Modals/ListSearch',
  component: ListSearch,
};

const options = Array.from({ length: 100 }).map((_, i) => ({
  name: `${i}`,
}));

const Template: Story = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Grid>
      <BaseButton onClick={() => setOpen(true)}> Open Modal </BaseButton>
      <ListSearch
        title="app.admin"
        open={open}
        onClose={() => setOpen(false)}
        options={options}
        optionKey="name"
      />
    </Grid>
  );
};

export const Primary = Template.bind({});
