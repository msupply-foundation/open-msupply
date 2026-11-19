import { t, type LocaleKey } from '@/intl';

// The cold chain reference data the server seeds — equipment status reasons,
// categories and catalogue types — is stored as English text. Shown as stored,
// it stays English whatever the display language (issue #1307), so each
// seeded row is named here by id and shown in the display language instead.
//
// Only while the row still holds its seeded English: a row someone has renamed
// shows as they named it, and a row someone added has no id here. The stored
// text is never changed, so exports and the catalogue import, which match
// names exactly, keep working on the stored English.

type Seeded = {
  /** The name the server seeds, and earlier seeded names. */
  seeded: readonly string[];
  key: LocaleKey;
};

const REASONS: Record<string, Seeded> = {
  '020a3b04-4a29-46ca-9afd-140edcc15b7c': {
    seeded: ['Awaiting installation'],
    key: 'reason.awaiting-installation',
  },
  '44f648e9-2ff1-4010-be84-6bb6befce2d7': {
    seeded: ['Stored'],
    key: 'reason.stored',
  },
  '772231c3-d715-4a80-868b-57afb58f7e89': {
    seeded: ['Offsite for repairs'],
    key: 'reason.offsite-for-repairs',
  },
  '6c79d05f-ebd0-4a1d-9d7e-fcea52fb24e4': {
    seeded: ['Awaiting decommissioning'],
    key: 'reason.awaiting-decommissioning',
  },
  '325c1a24-97eb-4597-885d-253a52430125': {
    seeded: ['Needs servicing'],
    key: 'reason.needs-servicing',
  },
  '2f734462-c76d-4b08-b8d2-40b250538d46': {
    // Renamed by the server's v3.4 migration
    seeded: [
      'Multiple temperature excursions',
      'Multiple temperature breaches',
    ],
    key: 'reason.multi-temperature-breaches',
  },
  'd37a8d80-aaa7-4585-a1fc-0c69f7770129': {
    seeded: ['Unknown'],
    key: 'reason.unknown',
  },
  'b4ae8758-27d8-440c-8f23-08d5423748e8': {
    seeded: ['Needs spare parts'],
    key: 'reason.needs-spare-parts',
  },
  '290ed6c8-20ef-469d-bf6c-dd944ae24e8f': {
    seeded: ['Lack of power'],
    key: 'reason.lack-of-power',
  },
  'ba800d96-2cf6-44e8-8fbb-41fedb154265': {
    seeded: ['Solar panel failure'],
    key: 'reason.solar-panel-failure',
  },
  '646c80b2-2ff7-4c50-916b-18ff3df5cfb5': {
    seeded: ['Other'],
    key: 'reason.other',
  },
};

const CATEGORIES: Record<string, Seeded> = {
  'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d': {
    seeded: ['Insulated containers'],
    key: 'asset-category.insulated-containers',
  },
  '02cbea92-d5bf-4832-863b-c04e093a7760': {
    seeded: ['Refrigerators and freezers'],
    key: 'asset-category.refrigerators-and-freezers',
  },
  '7db32eb6-5929-4dd1-a5e9-01e36baa73ad': {
    seeded: ['Cold rooms and freezer rooms'],
    key: 'asset-category.cold-rooms-and-freezer-rooms',
  },
};

const TYPES: Record<string, Seeded> = {
  '99906787-bd32-4ec2-bd2d-ba5547622bb0': {
    seeded: ['Cold box - long range'],
    key: 'asset-type.cold-box-long-range',
  },
  'bbab79fe-8112-4f90-aabc-726f88a15410': {
    seeded: ['Cold box - short range'],
    key: 'asset-type.cold-box-short-range',
  },
  '7f53b6d5-c45f-5b4d-9a81-c88ef7d2779f': {
    seeded: ['Cold box - long range - freeze-free'],
    key: 'asset-type.cold-box-long-range-freeze-free',
  },
  '0478156c-a2bd-5cbf-b328-ae87973f0482': {
    seeded: ['Cold box - short range - freeze-free'],
    key: 'asset-type.cold-box-short-range-freeze-free',
  },
  '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b': {
    seeded: ['Vaccine carrier'],
    key: 'asset-type.vaccine-carrier',
  },
  'ad3405e1-ef3f-4159-b693-0e7d5fa6a814': {
    seeded: ['Vaccine carrier - freeze-free'],
    key: 'asset-type.vaccine-carrier-freeze-free',
  },
  'f2f2756e-0c15-49fd-bb01-3f45886e4870': {
    seeded: ['Long-term passive storage device'],
    key: 'asset-type.long-term-passive-storage-device',
  },
  'fd79171f-5da8-4801-b299-9426f34310a8': {
    seeded: ['Refrigerator'],
    key: 'asset-type.refrigerator',
  },
  '710194ce-8c6c-47ab-b7fe-13ba8cf091f6': {
    seeded: ['Freezer'],
    key: 'asset-type.freezer',
  },
  '0e58c7e6-e603-4513-a088-79fe9f08e22f': {
    seeded: ['Combined refrigerator / freezer'],
    key: 'asset-type.combined-refrigerator-freezer',
  },
  '4d7302b8-e47b-42fd-ac5e-4645376aa349': {
    seeded: ['Ice-lined refrigerator'],
    key: 'asset-type.ice-lined-refrigerator',
  },
  'c9017d0b-ce3c-40f1-9986-e4afe0185ddd': {
    seeded: ['Combined ice-lined refrigerator / freezer'],
    key: 'asset-type.combined-ice-lined-refrigerator-freezer',
  },
  'd4434727-dc35-437d-a5fa-739a491381b7': {
    seeded: ['Solar direct drive refrigerator'],
    key: 'asset-type.solar-direct-drive-refrigerator',
  },
  '525b614e-f9f5-4866-9553-24bad2b7b826': {
    seeded: ['Solar direct drive freezer'],
    key: 'asset-type.solar-direct-drive-freezer',
  },
  '8b32f63b-28ac-4c31-94dc-55ddb5aa131a': {
    seeded: ['Solar direct drive combined refrigerator / freezer'],
    key: 'asset-type.solar-direct-drive-combined-refrigerator-freezer',
  },
  '05d9a49a-4d94-4e00-9728-2549ad323544': {
    seeded: ['Ultralow freezer'],
    key: 'asset-type.ultralow-freezer',
  },
  'f242a852-1964-5f02-bda3-180c201cfa2e': {
    seeded: ['Other'],
    key: 'asset-type.other',
  },
  '9a4ad0dd-138a-41b2-81df-08772635085e': {
    seeded: ['Cold room'],
    key: 'asset-type.cold-room',
  },
  '6d49edfd-a12b-43c8-99fb-3300d67e0192': {
    seeded: ['Freezer room'],
    key: 'asset-type.freezer-room',
  },
};

/** Every seeded row, by kind — for the test that pins them to the catalog. */
export const SEEDED = {
  reasons: REASONS,
  categories: CATEGORIES,
  types: TYPES,
};

const named = (
  table: Record<string, Seeded>,
  id: string,
  stored: string
): string => {
  const seeded = table[id];
  return seeded?.seeded.includes(stored) ? t(seeded.key) : stored;
};

/** A status reason's name in the display language. */
export const reasonName = (reason: { id: string; reason: string }): string =>
  named(REASONS, reason.id, reason.reason);

/** An asset category's name in the display language. */
export const categoryName = (category: { id: string; name: string }): string =>
  named(CATEGORIES, category.id, category.name);

/** An asset catalogue type's name in the display language. */
export const typeName = (type: { id: string; name: string }): string =>
  named(TYPES, type.id, type.name);
