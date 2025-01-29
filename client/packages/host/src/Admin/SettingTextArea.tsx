import React, { ChangeEvent } from 'react';
import {
  ButtonWithIcon,
  Grid,
  SaveIcon,
  Switch,
  TextArea,
  useTranslation,
} from '@openmsupply-client/common';
import { Setting } from './Setting';

export type TextValue = {
  enabled: boolean;
  text: string;
};

interface SettingTextAreaProps {
  defaultValue?: TextValue;
  icon?: JSX.Element;
  onSave: (value: TextValue) => void;
  onToggle?: (checked: boolean) => void;
  /** Info text displayed next to the settings label */
  infoText?: string;
  title: string;
  visible: boolean;
}

export const SettingTextArea: React.FC<SettingTextAreaProps> = ({
  defaultValue = { enabled: false, text: '' },
  icon,
  onSave,
  onToggle,
  infoText,
  title,
  visible,
}) => {
  const t = useTranslation();
  const [value, setValue] = React.useState(defaultValue);

  const changeText = (event: ChangeEvent<HTMLTextAreaElement>) =>
    setValue({ enabled: value.enabled, text: event.target.value || '' });

  const onToggleChecked = (
    _: React.SyntheticEvent<Element, Event>,
    checked: boolean
  ) => {
    setValue({ enabled: checked, text: value.text });
    onToggle?.(checked);
  };

  return visible ? (
    <>
      <Setting
        infoText={infoText}
        component={
          <Switch checked={value.enabled} onChange={onToggleChecked} />
        }
        icon={icon}
        title={title}
      />

      {value.enabled && (
        <Grid container flexDirection="column" alignItems="flex-end">
          <Grid
            sx={{
              marginBottom: '5px',
              width: '100%',
            }}
            flex={1}
          >
            <TextArea
              onChange={changeText}
              value={value.text}
              maxRows={10}
              minRows={10}
              style={{ padding: '0 0 0 50px' }}
              slotProps={{
                htmlInput: {
                  sx: {
                    borderColor: 'gray.main',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    borderRadius: '5px',
                    padding: '3px',
                  },
                },
              }}
            />
          </Grid>
          <Grid>
            <ButtonWithIcon
              Icon={<SaveIcon />}
              label={t('button.save')}
              variant="contained"
              sx={{ fontSize: '12px' }}
              onClick={() => onSave(value)}
            />
          </Grid>
        </Grid>
      )}
    </>
  ) : null;
};
