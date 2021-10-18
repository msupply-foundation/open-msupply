import React, { FC } from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { Story } from '@storybook/react';
import { FlatButton } from './FlatButton';
import { Book } from '../../icons';
import { BaseButton, ButtonWithIcon } from '.';
import { Customers } from '../../icons';
import { DialogButton, IconButton } from '..';

const getOnClick = (someText: string) => () => {
  alert(someText);
};

const Wrapper: FC<{ text: string }> = ({ children, text }) => {
  return (
    <Grid item>
      <Paper
        sx={{
          width: 300,
          height: 180,
          justifyContent: 'center',
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography sx={{ marginBottom: 2 }} variant="subtitle1">
          {text}
        </Typography>
        {children}
      </Paper>
    </Grid>
  );
};

const Template: Story = () => (
  <Grid container gap={2}>
    <Wrapper text="Base Button: Outlined variant, primary color">
      <BaseButton
        variant="outlined"
        color="primary"
        onClick={getOnClick('Base button')}
      >
        Base Button
      </BaseButton>
    </Wrapper>

    <Wrapper text="Base Button: Outlined variant, secondary color">
      <BaseButton
        variant="outlined"
        color="secondary"
        onClick={getOnClick('Base button')}
      >
        Base Button
      </BaseButton>
    </Wrapper>

    <Wrapper text="Base Button: Contained variant, primary color">
      <BaseButton
        variant="contained"
        color="primary"
        onClick={getOnClick('Base button')}
      >
        Base Button
      </BaseButton>
    </Wrapper>

    <Wrapper text="Base Button: Contained variant, secondary color">
      <BaseButton
        variant="contained"
        color="secondary"
        onClick={getOnClick('Base button')}
      >
        Base Button
      </BaseButton>
    </Wrapper>

    <Wrapper text="Button with Icon, contained & primary">
      <ButtonWithIcon
        variant="contained"
        color="primary"
        Icon={<Customers />}
        labelKey="app.customers"
        onClick={getOnClick('With Icon!')}
      />
    </Wrapper>

    <Wrapper text="Button with Icon, contained & secondary">
      <ButtonWithIcon
        variant="contained"
        color="secondary"
        Icon={<Customers />}
        labelKey="app.customers"
        onClick={getOnClick('With Icon!')}
      />
    </Wrapper>

    <Wrapper text="Button with Icon, outlined & primary">
      <ButtonWithIcon
        variant="outlined"
        color="primary"
        Icon={<Customers />}
        labelKey="app.customers"
        onClick={getOnClick('With Icon!')}
      />
    </Wrapper>

    <Wrapper text="Button with Icon, outlined & secondary">
      <ButtonWithIcon
        variant="outlined"
        color="secondary"
        Icon={<Customers />}
        labelKey="app.customers"
        onClick={getOnClick('With Icon!')}
      />
    </Wrapper>

    <Wrapper text="Dialog OK button">
      <DialogButton variant="ok" onClick={getOnClick('OK!')} />
    </Wrapper>

    <Wrapper text="Dialog OK & Next button">
      <DialogButton variant="next" onClick={getOnClick('OK & Next!')} />
    </Wrapper>

    <Wrapper text="Dialog cancel button">
      <DialogButton variant="cancel" onClick={getOnClick('Cancel!')} />
    </Wrapper>

    <Wrapper text="Flat button">
      <FlatButton
        icon={<Book />}
        labelKey="button.docs"
        onClick={() => console.info('clicked')}
      />
    </Wrapper>

    <Wrapper text="Icon button">
      <IconButton
        icon={<Book />}
        labelKey="button.docs"
        onClick={() => console.info('clicked')}
      />
    </Wrapper>
  </Grid>
);

export const Primary = Template.bind({});
export const Secondary = Template.bind({});

export default {
  title: 'Buttons/ButtonShowcase',
};
