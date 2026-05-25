import React from 'react';
import {
  BasicTextInput,
  Box,
  Checkbox,
  Typography,
  Widget,
} from '@openmsupply-client/common';
import {
  DEFAULT_EXAMPLE_PLUGIN_CONFIG,
  ExamplePluginConfig,
} from './types';

// Custom React configuration UI. Shipped via the `Component` slot of the
// plugin's `configuration` field. The equivalent JSON Forms version is kept
// as commented-out reference in ../plugin.tsx for plugin authors to compare.
//
// Demonstrates two things JSON Forms can't easily do:
//   - bespoke composition (the live-preview pane below the form)
//   - direct access to the host's component library, fully styled with the
//     project's design system
type Props = {
  value: ExamplePluginConfig;
  onChange: (next: ExamplePluginConfig) => void;
};

export const ExamplePluginConfigComponent = ({ value, onChange }: Props) => {
  // Defensive: if the persisted blob is missing fields (older row, hand-edited
  // DB, etc.), fall back to defaults so the form always has something to render.
  const config: ExamplePluginConfig = {
    ...DEFAULT_EXAMPLE_PLUGIN_CONFIG,
    ...value,
  };

  const patch = (next: Partial<ExamplePluginConfig>) =>
    onChange({ ...config, ...next });

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Checkbox
            checked={config.enabled}
            onChange={(_, checked) => patch({ enabled: checked })}
          />
          <Typography>Show Sync Status widget</Typography>
        </Box>

        <BasicTextInput
          label="Sync widget title"
          fullWidth
          value={config.logPrefix}
          onChange={e => patch({ logPrefix: e.target.value })}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="gray.main">
          Live preview
        </Typography>
        {config.enabled ? (
          <Widget title={config.logPrefix || 'Sync widget title'}>
            <Box padding={2}>
              <Typography variant="body2" color="gray.dark">
                Sync status content would render here on the dashboard.
              </Typography>
            </Box>
          </Widget>
        ) : (
          <Typography variant="body2" color="gray.dark" sx={{ mt: 1 }}>
            Widget is hidden — toggle &ldquo;Show Sync Status widget&rdquo; to
            enable.
          </Typography>
        )}
      </Box>
    </Box>
  );
};
