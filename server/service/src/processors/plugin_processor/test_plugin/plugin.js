// processor_cursor_probe — the smallest possible processor plugin.
//
// It exists to make the processor loop observable from the server log. Every
// changelog row it is handed, it reports back with the row's cursor; the
// processor loop logs that message at INFO, so the log shows exactly which
// cursors the plugin was asked to process, and how many times each.
//
// A correct processor loop hands each matching row to the plugin once. If the
// same cursor is logged over and over, the loop is re-reading the last row it
// processed (the bug this plugin was written to demonstrate, fixed in
// `ChangelogRepository::compatibility_query`).
//
// The filter is `table_name = Invoice`, the same filter deployed country
// plugins use, so creating or editing any invoice produces a row to process.
// It makes no host calls (`sql`, `use_graphql`, ...) so it cannot fail for any
// reason other than the loop itself.
//
// The same source is exercised by the Rust regression test in
// `server/service/src/processors/plugin_processor/test.rs` and shipped
// ready-to-install as `bundle.json` next to this file (see README.md).
const plugins = {
  processor: input => {
    switch (input.t) {
      case 'Filter':
        return { t: 'Filter', v: { table_name: { equal_to: 'Invoice' } } };
      case 'SkipOnError':
        return { t: 'SkipOnError', v: true };
      case 'Process':
        return {
          t: 'Process',
          v: `processor_cursor_probe: processed cursor ${input.v.cursor} (${input.v.table_name} ${input.v.record_id})`,
        };
      default:
        throw new Error(`processor_cursor_probe: unexpected input ${JSON.stringify(input)}`);
    }
  },
};

export { plugins };
