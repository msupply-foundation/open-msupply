# `processor_cursor_probe` — a test plugin for the processor loop

The smallest processor plugin the server will load. It filters the changelog on
`table_name = Invoice` (the filter deployed country plugins use) and, for every row
it is handed, returns a message naming the row's cursor. The processor loop
logs that message at INFO, so the server log shows exactly which cursors the
plugin was asked to process and how many times each.

It makes no host calls, so it cannot fail for any reason other than the loop
itself. Its version is `1.0.0`, which the plugin loader accepts on every
server version.

## What it demonstrates

Plugin processors read the changelog through
`ChangelogRepository::compatibility_query`. The processor loop stores the cursor
of the last row it processed and passes it straight back in on the next read,
so that read must be **exclusive** of the stored cursor. It was inclusive, so
once a plugin processor reached the newest matching row it was handed that
same row on every iteration, forever. Because all processors share one task,
requisition and shipment transfers behind it never ran: internal orders stopped
turning into requisitions on the supplying store.

## Reproducing the bug (a build without the fix)

1. Install `bundle.json` from this directory: **Manage → Plugins → Upload**
   in the UI, or

   ```sh
   remote_server_cli install-plugin-bundle \
     --path server/service/src/processors/plugin_processor/test_plugin/bundle.json \
     --url http://localhost:8000 --username <user> --password <password>
   ```

2. Create or edit any invoice, then trigger a sync (plugin processors are
   triggered after each sync cycle).
3. Watch the server log. It repeats one line at a steady rhythm without end:

   ```
   Plugin processor for processor_cursor_probe - processor_cursor_probe: processed cursor 4512 (Invoice <id>)
   Plugin processor for processor_cursor_probe - processor_cursor_probe: processed cursor 4512 (Invoice <id>)
   ...
   ```

   While that runs, an internal order sent to another store on this server
   does not produce a response requisition.

## Verifying the fix

Same steps. Each cursor is now logged exactly once, the log goes quiet once
the newest invoice row is processed, and the internal order turns into a
requisition as usual.

Uninstall afterwards from **Manage → Plugins**, or

```sh
remote_server_cli uninstall-plugin --id backend_processor_cursor_probe_1_0_0 \
  --url http://localhost:8000 --username <user> --password <password>
```

## Keeping `bundle.json` in step with `plugin.js`

`bundle.json` is `plugin.js` base64-encoded inside a plugin bundle. The Rust
test `bundle_json_matches_plugin_source` fails if they drift. After editing
`plugin.js`, regenerate it with:

```sh
python3 - <<'PY'
import base64, json
d = 'server/service/src/processors/plugin_processor/test_plugin/'
src = open(d + 'plugin.js', 'rb').read()
bundle = json.load(open(d + 'bundle.json'))
bundle['backend_plugins'][0]['bundle_base64'] = base64.b64encode(src).decode()
open(d + 'bundle.json', 'w').write(json.dumps(bundle, indent=2) + '\n')
PY
```
