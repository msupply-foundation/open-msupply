+++
title = "Patterns"
weight = 70
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Patterns

Recurring implementation patterns used across the codebase.

- [Changelog & Sync](#changelog-sync)
- [Feature Development](@/patterns/feature-development/_index.md) — feature branches and feature flags
- [Unit Testing & Mocking](@/patterns/unit-testing/_index.md)
- [Table Implementation](@/patterns/table-implementation/_index.md)
- [Card List Implementation](@/patterns/card-list-implementation/_index.md)

## Changelog & Sync

Any data that needs to be synced to a central server should have a change record in the changelog table each time the record is updated or created. This allows open-mSupply to identify which records need to be sent to central server next time it syncs.

To Implement this, we are using a pattern like this.

https://github.com/msupply-foundation/open-msupply/blob/03f55909a39079cb994bb2a1cb6a4961343d51d9/server/repository/src/db_diesel/assets/asset_row.rs#L90

Example from `asset_row.rs`
```rs
    pub fn upsert_one(&self, asset_row: &AssetRow) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_row)?;
        self.insert_changelog(
            asset_row.id.to_owned(),
            RowActionType::Upsert,
            Some(asset_row.clone()),
        )
    }

    fn insert_changelog(
        &self,
        asset_id: String,
        action: RowActionType,
        row: Option<AssetRow>,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Asset,
            record_id: asset_id,
            row_action: action,
            store_id: row.map(|r| r.store_id).unwrap_or(None),
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }
```

This will mean that the changelog record is created every time `upsert_one` is called.
