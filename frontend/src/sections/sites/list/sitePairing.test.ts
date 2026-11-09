import { describe, expect, it } from 'vitest';
import {
  MULTI_DEVICE_FLAG,
  multiDeviceDisabled,
  multiDeviceFlagEnabled,
  showsClearHardwareId,
  showsMultiDeviceReason,
  showsPairingControls,
} from './sitePairing';

// Anchors: spec/sites/cases/OMS-FUN-SYC-002 (behaviours cited per describe).

describe('OMS-FUN-SYC-002.24 — the clear controls appear only for a current-flow site that is not the server own', () => {
  it('offers them on a V7 site that is not the own site', () => {
    expect(showsPairingControls({ id: 7, syncVersion: 'V7' }, 6)).toBe(true);
  });

  it('withholds them on a legacy-flow site (OMS-FUN-SYC-002.28 made unreachable)', () => {
    expect(showsPairingControls({ id: 7, syncVersion: 'V5V6' }, 6)).toBe(false);
  });

  it('withholds them on the server own site (OMS-FUN-SYC-002.29 made unreachable)', () => {
    expect(showsPairingControls({ id: 6, syncVersion: 'V7' }, 6)).toBe(false);
  });

  it('treats no known own site as "not own" — only the version condition then applies', () => {
    expect(showsPairingControls({ id: 6, syncVersion: 'V7' }, undefined)).toBe(
      true
    );
  });
});

describe('OMS-FUN-SYC-002.26 — the hardware-id clear is offered only while there is one to release', () => {
  it('offers it with a hardware id and withholds it without', () => {
    const paired = { id: 7, syncVersion: 'V7' as const, hardwareId: 'HW-1' };
    expect(showsClearHardwareId(paired, 6)).toBe(true);
    expect(showsClearHardwareId({ ...paired, hardwareId: null }, 6)).toBe(
      false
    );
    expect(showsClearHardwareId({ ...paired, hardwareId: '' }, 6)).toBe(false);
  });

  it('still withholds it on a legacy-flow or own site that HAS one', () => {
    expect(
      showsClearHardwareId(
        { id: 7, syncVersion: 'V5V6', hardwareId: 'HW-1' },
        6
      )
    ).toBe(false);
    expect(
      showsClearHardwareId({ id: 6, syncVersion: 'V7', hardwareId: 'HW-1' }, 6)
    ).toBe(false);
  });
});

describe('OMS-FUN-SYC-002.30 — the multi-device switch cannot be turned back off once on', () => {
  it('disables the switch once the site is multi-device, flag or no flag', () => {
    expect(multiDeviceDisabled(true, true)).toBe(true);
    expect(multiDeviceDisabled(true, false)).toBe(true);
  });

  it('suppresses the flag reason once it is on — it no longer applies', () => {
    expect(showsMultiDeviceReason(true, false)).toBe(false);
  });
});

describe('OMS-FUN-SYC-002.31 — the switch is inoperable while the server configuration flag is unset, and names the flag as the reason', () => {
  it('reads the flag out of the arbitrary-JSON featureFlags map', () => {
    expect(multiDeviceFlagEnabled({ [MULTI_DEVICE_FLAG]: true })).toBe(true);
    expect(multiDeviceFlagEnabled({ [MULTI_DEVICE_FLAG]: false })).toBe(false);
    // The probe server's live answer: an empty object.
    expect(multiDeviceFlagEnabled({})).toBe(false);
  });

  it('treats a non-map value as unset rather than trusting it', () => {
    expect(multiDeviceFlagEnabled(undefined)).toBe(false);
    expect(multiDeviceFlagEnabled(null)).toBe(false);
    expect(multiDeviceFlagEnabled('true')).toBe(false);
    expect(multiDeviceFlagEnabled([MULTI_DEVICE_FLAG])).toBe(false);
  });

  it('is inoperable and states its reason while the flag is unset', () => {
    expect(multiDeviceDisabled(false, false)).toBe(true);
    expect(showsMultiDeviceReason(false, false)).toBe(true);
  });

  it('is operable and silent once the flag is set', () => {
    expect(multiDeviceDisabled(false, true)).toBe(false);
    expect(showsMultiDeviceReason(false, true)).toBe(false);
  });
});
