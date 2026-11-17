import { readFileSync } from 'node:fs';
import map from 'virtual:legacy-table-config-map';
import { describe, expect, it } from 'vitest';

// The map the server migration fragment converts shared layouts with. The
// front end's personal-layout import must apply exactly the same one, so the
// virtual module has to serve this file unchanged. Relative to frontend/, where
// vitest runs.
const SERVER_MAP =
  '../server/repository/src/migrations/v3_04_01/migrate_global_table_configs_to_default_configs/legacy_table_config_map.json';

describe('virtual:legacy-table-config-map', () => {
  it("serves the server migration fragment's map", () => {
    expect(map).toEqual(JSON.parse(readFileSync(SERVER_MAP, 'utf8')));
  });
});
