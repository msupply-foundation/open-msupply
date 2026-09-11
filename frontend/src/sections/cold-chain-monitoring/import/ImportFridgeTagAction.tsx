import { createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { storePath } from '@/nav/storeRelativePath';
import { Button } from '@/ui/elements/buttons/Button';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { ImportIcon } from '@/ui/icons';
import { useIsCompact } from '@/ui/utils/createMediaQuery';
import { createConfirmOnLeave } from '@/domain/confirmOnLeave';
import { SensorName } from '../monitoring.generated';
import type { MonitoringFilter } from '../monitoring/monitoringState';
import {
  ACCEPTED_FILE_TYPES,
  importFridgeTag,
  type ImportOutcome,
} from './importFridgeTag';

// S4 — the fridge-sensor import (spec/cold-chain-monitoring ui-surface S4;
// rules › importing a fridge-sensor file): the page action that opens the
// platform file chooser, the upload it starts, and the outcomes. Not a screen
// of its own. The button shows its loading state for the duration and leaving
// the page is guarded while the upload is in flight; the outcome itself is
// reported by the screen, in place (ui-standards › action feedback — no
// toast), through `onOutcome`.

export interface ImportFridgeTagActionProps {
  storeId: string;
  /** Every outcome, for the screen to state in place. */
  onOutcome: (outcome: ImportOutcome) => void;
  /** Data was taken in — the tabs re-read so it shows without a reload. */
  onImported: () => void;
  /**
   * The phone-sized hand-off (rules): a successful import narrows THIS screen
   * to the new sensor and the range the file covered, in place of the
   * new-sensor prompt.
   */
  onNarrow: (filter: MonitoringFilter) => void;
}

export const ImportFridgeTagAction: Component<
  ImportFridgeTagActionProps
> = props => {
  const navigate = useNavigate();
  const compact = useIsCompact();
  let input!: HTMLInputElement;
  const [uploading, setUploading] = createSignal(false);
  // The sensor the import created, while the "New sensor added" prompt is up.
  const [newSensorId, setNewSensorId] = createSignal<string>();

  // Navigating away abandons the upload, so leaving is guarded while one is
  // in flight (rules). A tab switch or a filter edit on this same screen is
  // not a leave — the upload survives it.
  const leaveGuard = createConfirmOnLeave({
    isDirty: uploading,
    sameRouteIsNotLeave: true,
  });

  const run = async (file: File) => {
    if (uploading()) return;
    setUploading(true);
    const outcome = await importFridgeTag(props.storeId, file);
    setUploading(false);
    props.onOutcome(outcome);
    if (outcome.kind !== 'imported') return;
    props.onImported();
    const {
      newSensorId: created,
      startDatetime,
      endDatetime,
    } = outcome.response;
    if (compact()) {
      // The file's range, and — where a sensor was created — its name, which
      // the response does not carry and the screen filters by.
      let sensorName: string | null = null;
      if (created) {
        const sensor = await graphqlFetch(
          SensorName,
          { storeId: props.storeId, id: created },
          { background: true }
        );
        if (sensor.kind === 'success')
          sensorName = sensor.data.sensors.nodes[0]?.name ?? null;
      }
      props.onNarrow({
        sensorName,
        startDatetime: { start: startDatetime, end: endDatetime },
        unacknowledged: null,
      });
      return;
    }
    if (created) setNewSensorId(created);
  };

  // Confirming the prompt opens that sensor for editing on the sensors
  // screen — its arrival hand-off (`?edit=<id>`); declining stays put with
  // the import intact.
  const editNewSensor = () => {
    const id = newSensorId();
    if (!id) return;
    navigate(
      `${storePath(props.storeId, 'cold-chain/sensors')}?edit=${encodeURIComponent(id)}`
    );
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        hidden
        tabindex={-1}
        aria-hidden="true"
        data-testid="import-fridge-tag-input"
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          // Reset so choosing the same file again fires change again.
          event.currentTarget.value = '';
          if (file) void run(file);
        }}
      />
      <Button
        icon={<ImportIcon />}
        variant="secondary"
        collapsible="narrow"
        title={t('tooltip.import-fridge-tag')}
        loading={uploading()}
        data-testid="import-fridge-tag-button"
        onClick={() => input.click()}
      >
        {t('button.import-fridge-tag')}
      </Button>
      <ConfirmDialog
        open={newSensorId() !== undefined}
        title={t('title.new-sensor')}
        message={t('messages.new-sensor')}
        onConfirm={editNewSensor}
        onClose={() => setNewSensorId(undefined)}
      />
      <ConfirmDialog
        open={leaveGuard.open()}
        message={t('messages.fridge-tag-import-in-progress')}
        onConfirm={leaveGuard.confirm}
        onClose={leaveGuard.cancel}
      />
    </>
  );
};
