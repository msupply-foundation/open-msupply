+++
title = "Suggestion Snippets"
weight = 40
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Suggestion Snippets

> [!NOTE]
> For most of the transformations below ("add a new migration", "add a new sync table", etc.), asking an AI assistant — pointing it at the reference commit linked in each section — is now usually the lowest-friction path. The `sed` recipes here remain useful as a precise, reproducible reference: they're explicit about exactly which substitutions are being made, which is harder to verify when an AI does it.

## Summary

In this page you can find common commits that can be changed and applied to help with common coding tasking.

Use `git reset HEAD` if you need to discard all the changes

If you want to manually edit instead of `| git apply --3 -C1` do ` > out.diff` then edit out.diff and `git apply --3 -C1 < out.diff`

Make sure to apply diff from root dir.

Sometimes git apply will fail, can try with `--reject` flag (instead of `--3way`)

## Commit snippets

<details>
<summary> New version and migration </summary>

From [this commit](https://github.com/msupply-foundation/open-msupply/commit/1df4fcac3e09ccc428e1740fc44b7b815bfda429)

```bash
NEW_VERSION=2_07_00
NEW_VERSION_DOT=2.7.0
PREVIOUS_VERSION=2_06_00
MIGRATION=new_migration_name
git show 1df4fcac3e09ccc428e1740fc44b7b815bfda429 | sed 's/2_06_00/'${NEW_VERSION}'/g ; s/2.6.0/'${NEW_VERSION_DOT}'/g ; s/2_05_00/'${PREVIOUS_VERSION}'/g ; s/add_index_to_sync_buffer/'${MIGRATION}'/g' | git apply --3 -C1 --whitespace=fix
```
</details>


<details>
<summary> New table with sync (as omSupply central data) </summary>

From [this commit](https://github.com/msupply-foundation/open-msupply/commit/acc8bce66e49cd0f91f9351e3be02ba188664dd4)

```bash
NEW_TABLE_NAME=new_table
NEW_TABLE_NAME_CAMEL=NewTable
MIGRATION=2_06_00
MIGRATION_NAME=add_new_table

git show acc8bce66e49cd0f91f9351e3be02ba188664dd4 | sed 's/ExampleTable/'${NEW_TABLE_NAME_CAMEL}'/g ; s/example_table/'${NEW_TABLE_NAME}'/g ; s/2_06_00/'${MIGRATION}'/g ; s/add_example_table/'${MIGRATION_NAME}'/g' | git apply --3 -C1 --whitespace=fix
```
</details>

<details>
<summary> New Key Type for KeyValueStore </summary>

Part of [this commit](https://github.com/msupply-foundation/open-msupply/commit/6741380effd7be7f24e5865ad4af6b0f7af90c53)

```bash
NEW_VARIANT=LoadPluginProcessorCursor
NEW_VARIANT_PG=LOAD_PLUGIN_PROCESSOR_CURSOR
MIGRATION=2_06_00
MIGRATION_NAME=add_some_variant

git show acc8bce66e49cd0f91f9351e3be02ba188664dd4 | sed 's/LoadPluginProcessorCursor/'${NEW_VARIANT}'/g ; s/LOAD_PLUGIN_PROCESSOR_CURSOR/'${LOAD_PLUGIN_PROCESSOR_CURSOR}'/g ; s/2_06_00/'${MIGRATION}'/g ; s/add_load_plugin_processor_pg_enum_type/'${MIGRATION_NAME}'/g' | git apply --3 -C1 --whitespace=fix
```
</details>
