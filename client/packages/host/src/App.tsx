// @ts-nocheck
import React, { FC } from 'react';
import Host from './Host';
import '@fontsource-variable/inter';

const error = false;

const check = slotProps => {
  const error = false;
  const props = {
    disable: false,
  };

  console.log({
    input: {
      disableInjectingGlobalStyles: true,
      disableUnderline: error ? true : false,
      sx: {
        border: theme =>
          error ? `2px solid ${theme.palette.error.main}` : 'none',

        backgroundColor: theme =>
          props.disabled
            ? theme.palette.background.toolbar
            : theme.palette.background.menu,
        borderRadius: 1,
        padding: 0.5,
      },
      ...slotProps?.input,
    },
    htmlInput: {
      style: props?.disabled ? { textOverflow: 'ellipsis' } : {},
      inputMode: props?.disabled ? undefined : props.inputMode,
      sx: { padding: 0.5 },
      ...slotProps?.htmlInput,
    },
    ...slotProps,
  });
};

console.log(check({ input: { sx: { shouldNotOverrideAll: 'but it does ' } } }));

const check2 = slotProps => {
  const error = false;
  const props = {
    disable: false,
  };

  console.log({
    ...slotProps,
    input: {
      disableInjectingGlobalStyles: true,
      disableUnderline: error ? true : false,
      ...slotProps?.input,
      sx: {
        border: theme =>
          error ? `2px solid ${theme.palette.error.main}` : 'none',

        backgroundColor: theme =>
          props.disabled
            ? theme.palette.background.toolbar
            : theme.palette.background.menu,
        borderRadius: 1,
        padding: 0.5,
        ...slotProps?.input?.sx,
      },
    },
    htmlInput: {
      style: props?.disabled ? { textOverflow: 'ellipsis' } : {},
      inputMode: props?.disabled ? undefined : props.inputMode,
      ...slotProps?.htmlInput,
      sx: { padding: 0.5, ...slotProps?.htmlInput?.sx },
    },
  });
};

console.log(
  check2({ input: { sx: { shouldNotOverrideAll: 'it doesnt', padding: 0.6 } } })
);

const App: FC = () => <Host />;

export default App;
