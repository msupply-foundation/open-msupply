import React from 'react';
import {
  Stack,
  Switch,
  ToggleButtonGroup,
  InputWithLabelRow,
  useTranslation,
  EyeIcon,
  EyeOffIcon,
  ZapIcon,
  PropertyDisplayModeV2Input,
  PropertyNodeDisplayModeV2,
} from '@openmsupply-client/common';
import { PropertyScopeDef, toInputMode } from '../utils';

interface ScopeRowProps {
  scope: PropertyScopeDef;
  /** Current display mode, or `undefined` when not associated with this scope. */
  mode?: PropertyNodeDisplayModeV2;
  disabled?: boolean;
  /** `null` disassociates; otherwise sets the display mode. */
  onChange: (displayMode: PropertyDisplayModeV2Input | null) => void;
}

export const ScopeRow = ({
  scope,
  mode,
  disabled,
  onChange,
}: ScopeRowProps) => {
  const t = useTranslation();
  const associated = mode !== undefined;

  const options = [
    {
      id: 'hidden',
      value: PropertyDisplayModeV2Input.Hidden,
      icon: <EyeOffIcon fontSize="small" />,
      label: t('label.hidden'),
    },
    {
      id: 'visible',
      value: PropertyDisplayModeV2Input.Visible,
      icon: <EyeIcon fontSize="small" />,
      label: t('label.visible'),
    },
    // Prominent only where there's a primary surface to promote to.
    ...(scope.supportsProminent
      ? [
          {
            id: 'prominent',
            value: PropertyDisplayModeV2Input.Prominent,
            icon: <ZapIcon fontSize="small" />,
            label: t('label.prominent'),
          },
        ]
      : []),
  ];

  return (
    <InputWithLabelRow
      label={t(scope.labelKey)}
      Input={
        <Stack direction="row" alignItems="center" gap={2}>
          <Switch
            checked={associated}
            disabled={disabled}
            onChange={(_event, checked) =>
              onChange(checked ? PropertyDisplayModeV2Input.Visible : null)
            }
          />
          {associated && (
            <ToggleButtonGroup<PropertyDisplayModeV2Input>
              value={mode ? toInputMode(mode) : null}
              // MUI fires `null` when the active button is clicked again —
              // ignore it so a mode can't be cleared into an invalid state.
              onChange={value => {
                if (value && !disabled) onChange(value);
              }}
              options={options}
            />
          )}
        </Stack>
      }
    />
  );
};
