use std::collections::HashMap;

use crate::{
    ChangelogCondition, ChangelogRepository, ChangelogRow, ChangelogTableName, CurrencyRow,
    CurrencyRowRepository, CursorAndLimit, InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow,
    InvoiceRowRepository, ItemRow, ItemRowRepository, LocationTypeRow, LocationTypeRowRepository,
    NameRow, NameRowRepository, RepositoryError, RowActionType, StockLineRow,
    StockLineRowRepository, StorageConnection, StoreRow, StoreRowRepository, UnitRow,
    UnitRowRepository,
};

/// Max ids per IN-clause when batch-fetching rows; keeps us well below
/// SQLite's default 999-parameter limit and groups queries efficiently.
const ROW_FETCH_BATCH_SIZE: usize = 500;

/// One of the row variants that can appear in a changelog. Only the tables
/// supported by the first iteration of `query_with_data` are listed;
/// extend this enum (and `fetch_rows_for_table`) as more tables are wired up.
#[derive(Debug, Clone)]
pub enum Row {
    Unit(UnitRow),
    Currency(CurrencyRow),
    Name(NameRow),
    Store(StoreRow),
    LocationType(LocationTypeRow),
    Item(ItemRow),
    StockLine(StockLineRow),
    Invoice(InvoiceRow),
    InvoiceLine(InvoiceLineRow),
}

/// Output entry of `query_with_data`. `Row` carries the loaded row
/// alongside its changelog; `Delete` carries only the changelog (the record
/// no longer exists or was deleted).
#[derive(Debug, Clone)]
pub enum RowOrDelete {
    Row { changelog: ChangelogRow, row: Row },
    Delete { changelog: ChangelogRow },
}

impl RowOrDelete {
    pub fn changelog(&self) -> &ChangelogRow {
        match self {
            RowOrDelete::Row { changelog, .. } => changelog,
            RowOrDelete::Delete { changelog } => changelog,
        }
    }
}

impl<'a> ChangelogRepository<'a> {
    /// Like `ChangelogRepository::query`, but additionally loads the underlying
    /// row for each Upsert changelog (in batched queries grouped by table) and
    /// returns a `RowOrDelete`.
    ///
    /// Guarantees:
    /// - Returns up to `limit` entries. Falls short only when the changelog
    ///   stream is exhausted.
    /// - Within a (table_name, record_id) group, only the latest changelog
    ///   (highest cursor) is represented in the output. Re-queries to top up
    ///   when duplicates collapse the count.
    /// - If an Upsert changelog points to a row that no longer exists, that
    ///   entry is dropped from the output (the latest truth is "no row");
    ///   re-queries to top up.
    /// - Output is ordered ascending by cursor.
    ///
    /// Currently supports the variants in the `Row` enum. Other variants will
    /// trigger `unimplemented!()`. Callers should restrict `filter` accordingly.

    pub fn query_with_data(
        &self,
        filter: ChangelogCondition::Inner,
        CursorAndLimit { cursor, limit }: CursorAndLimit,
    ) -> Result<Vec<RowOrDelete>, RepositoryError> {
        let mut output_by_key: HashMap<(ChangelogTableName, String), RowOrDelete> = HashMap::new();
        let mut current_cursor = cursor;

        loop {
            let need = limit - output_by_key.len() as i64;
            if need <= 0 {
                break;
            }

            let changelogs = self.query(
                filter.clone(),
                CursorAndLimit {
                    cursor: current_cursor,
                    limit: need,
                },
            )?;

            if changelogs.is_empty() {
                break;
            }

            let last_cursor = changelogs
                .last()
                .map(|c| c.cursor)
                .unwrap_or(current_cursor);

            // Within-batch dedup: keep only the latest changelog for each
            // (table_name, record_id). `query` returns ascending by cursor, so
            // a plain insert into a HashMap does this.
            let mut batch_dedup: HashMap<(ChangelogTableName, String), ChangelogRow> =
                HashMap::new();
            for cl in changelogs {
                batch_dedup.insert((cl.table_name.clone(), cl.record_id.clone()), cl);
            }

            // Group upserts by table for batched row fetching.
            let mut upsert_ids_by_table: HashMap<ChangelogTableName, Vec<String>> = HashMap::new();
            for cl in batch_dedup.values() {
                if matches!(cl.row_action, RowActionType::Upsert) {
                    upsert_ids_by_table
                        .entry(cl.table_name.clone())
                        .or_default()
                        .push(cl.record_id.clone());
                }
            }

            let mut rows_by_table: HashMap<ChangelogTableName, HashMap<String, Row>> =
                HashMap::new();
            for (table_name, ids) in upsert_ids_by_table {
                let rows = fetch_rows_for_table(self.connection, &table_name, &ids)?;
                rows_by_table.insert(table_name, rows);
            }

            // Apply this batch to output_by_key, with cross-iteration supersession.
            for ((table_name, record_id), cl) in batch_dedup {
                let key = (table_name.clone(), record_id.clone());
                match cl.row_action {
                    RowActionType::Delete => {
                        output_by_key.insert(key, RowOrDelete::Delete { changelog: cl });
                    }
                    RowActionType::Upsert => {
                        let row = rows_by_table
                            .get_mut(&table_name)
                            .and_then(|m| m.remove(&record_id));
                        match row {
                            Some(row) => {
                                output_by_key.insert(key, RowOrDelete::Row { changelog: cl, row });
                            }
                            None => {
                                // Latest changelog for this key is an Upsert pointing
                                // at a missing row — supersedes any earlier output.
                                output_by_key.remove(&key);
                            }
                        }
                    }
                }
            }

            current_cursor = last_cursor;
        }

        let mut output: Vec<RowOrDelete> = output_by_key.into_values().collect();
        output.sort_by_key(|x| x.changelog().cursor);
        Ok(output)
    }
}

fn fetch_rows_for_table(
    connection: &StorageConnection,
    table_name: &ChangelogTableName,
    ids: &[String],
) -> Result<HashMap<String, Row>, RepositoryError> {
    let mut out: HashMap<String, Row> = HashMap::new();

    for chunk in ids.chunks(ROW_FETCH_BATCH_SIZE) {
        match table_name {
            ChangelogTableName::Unit => {
                for r in UnitRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Unit(r));
                }
            }
            ChangelogTableName::Currency => {
                for r in CurrencyRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Currency(r));
                }
            }
            ChangelogTableName::Name => {
                for r in NameRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Name(r));
                }
            }
            ChangelogTableName::Store => {
                for r in StoreRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Store(r));
                }
            }
            ChangelogTableName::LocationType => {
                for r in LocationTypeRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::LocationType(r));
                }
            }
            ChangelogTableName::Item => {
                for r in ItemRowRepository::new(connection).find_many_by_id(&chunk.to_vec())? {
                    out.insert(r.id.clone(), Row::Item(r));
                }
            }
            ChangelogTableName::StockLine => {
                for r in StockLineRowRepository::new(connection).find_many_by_ids(chunk)? {
                    out.insert(r.id.clone(), Row::StockLine(r));
                }
            }
            ChangelogTableName::Invoice => {
                for r in InvoiceRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Invoice(r));
                }
            }
            ChangelogTableName::InvoiceLine => {
                for r in InvoiceLineRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::InvoiceLine(r));
                }
            }
            other => unimplemented!("query_with_data does not yet support {:?}", other),
        }
    }

    Ok(out)
}

#[cfg(test)]
mod test {
    use super::*;
    use util::assert_matches;

    use crate::{
        dynamic_query_filter::FilterBuilder, mock::MockDataInserts, test_db::setup_all,
        ChangeLogInsertRow,
    };

    fn unit_filter() -> ChangelogCondition::Inner {
        ChangelogCondition::table_name::any(vec![ChangelogTableName::Unit])
    }

    fn insert_changelog(connection: &StorageConnection, row: ChangeLogInsertRow) -> i64 {
        let repo = ChangelogRepository::new(connection);
        repo.insert(&row).unwrap();
        repo.max_cursor().unwrap() as i64
    }

    fn upsert_unit(connection: &StorageConnection, id: &str) -> i64 {
        UnitRowRepository::new(connection)
            .upsert_one(&UnitRow {
                id: id.to_string(),
                name: format!("name-{id}"),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
        insert_changelog(
            connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: id.to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
        )
    }

    fn delete_unit_changelog(connection: &StorageConnection, id: &str) -> i64 {
        insert_changelog(
            connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: id.to_string(),
                row_action: RowActionType::Delete,
                ..Default::default()
            },
        )
    }

    #[actix_rt::test]
    async fn query_with_data_basic_mix() {
        let (_, connection, _, _) =
            setup_all("query_with_data_basic_mix", MockDataInserts::none()).await;

        let c1 = upsert_unit(&connection, "u1");
        let c2 = upsert_unit(&connection, "u2");
        let c3 = delete_unit_changelog(&connection, "u3");

        let result = ChangelogRepository::new(&connection).query_with_data(
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 10,
            },
        )
        .unwrap();

        assert_eq!(result.len(), 3);
        // Ordered ascending by cursor
        assert_eq!(result[0].changelog().cursor, c1);
        assert_eq!(result[1].changelog().cursor, c2);
        assert_eq!(result[2].changelog().cursor, c3);

        match &result[0] {
            RowOrDelete::Row {
                row: Row::Unit(u), ..
            } => assert_eq!(u.id, "u1"),
            _ => panic!("expected Row::Unit for u1"),
        }
        match &result[1] {
            RowOrDelete::Row {
                row: Row::Unit(u), ..
            } => assert_eq!(u.id, "u2"),
            _ => panic!("expected Row::Unit for u2"),
        }
        assert_matches!(&result[2], RowOrDelete::Delete { .. });
    }

    #[actix_rt::test]
    async fn query_with_data_dedups_and_tops_up() {
        let (_, connection, _, _) = setup_all(
            "query_with_data_dedups_and_tops_up",
            MockDataInserts::none(),
        )
        .await;

        // Three changelogs for u1 (duplicates), one each for u2/u3.
        upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u1");
        let last_u1 = upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");
        upsert_unit(&connection, "u3");

        let result = ChangelogRepository::new(&connection).query_with_data(
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 3,
            },
        )
        .unwrap();

        // Three distinct keys, exactly limit. u1 collapsed to its latest cursor.
        assert_eq!(result.len(), 3);
        let u1 = result
            .iter()
            .find(|x| x.changelog().record_id == "u1")
            .unwrap();
        assert_eq!(u1.changelog().cursor, last_u1);

        let ids: Vec<&str> = result
            .iter()
            .map(|x| x.changelog().record_id.as_str())
            .collect();
        assert!(ids.contains(&"u1"));
        assert!(ids.contains(&"u2"));
        assert!(ids.contains(&"u3"));
    }

    #[actix_rt::test]
    async fn query_with_data_skips_missing_and_tops_up() {
        let (_, connection, _, _) = setup_all(
            "query_with_data_skips_missing_and_tops_up",
            MockDataInserts::none(),
        )
        .await;

        // u1 exists, u2 has only a changelog (no underlying row), u3 exists.
        upsert_unit(&connection, "u1");
        insert_changelog(
            &connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u2".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
        );
        upsert_unit(&connection, "u3");

        let result = ChangelogRepository::new(&connection).query_with_data(
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 2,
            },
        )
        .unwrap();

        // u2 is dropped (Upsert pointing to non-existent row); u1 + u3 remain
        // and were topped up to reach limit=2.
        assert_eq!(result.len(), 2);
        let ids: Vec<&str> = result
            .iter()
            .map(|x| x.changelog().record_id.as_str())
            .collect();
        assert_eq!(ids, vec!["u1", "u3"]);
    }

    #[actix_rt::test]
    async fn query_with_data_returns_short_when_exhausted() {
        let (_, connection, _, _) = setup_all(
            "query_with_data_returns_short_when_exhausted",
            MockDataInserts::none(),
        )
        .await;

        upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = ChangelogRepository::new(&connection).query_with_data(
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 100,
            },
        )
        .unwrap();

        assert_eq!(result.len(), 2);
    }

    #[actix_rt::test]
    async fn query_with_data_dedups_across_iterations() {
        // Same (table, record_id) appears in two different iterations and
        // the later (higher-cursor) entry should replace the earlier one
        // already in `output_by_key`.
        //
        // Sequence:
        //   C1: u1 upsert (row exists)
        //   C2: u_missing upsert (no row)  <- skipped, keeps need > 0
        //   C3: u1 upsert again            <- same key, must supersede C1
        //   C4: u2 upsert (row exists)     <- fills second slot
        //
        // With limit=2, iter 1 fetches C1+C2 and materializes {u1: C1};
        // iter 2 fetches C3 and rewrites u1's entry to cursor C3 (output
        // count stays at 1, so the loop continues); iter 3 fetches C4.
        let (_, connection, _, _) = setup_all(
            "query_with_data_dedups_across_iterations",
            MockDataInserts::none(),
        )
        .await;

        let _c1 = upsert_unit(&connection, "u1");
        insert_changelog(
            &connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u_missing".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
        );
        let c3 = upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = ChangelogRepository::new(&connection).query_with_data(
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 2,
            },
        )
        .unwrap();

        assert_eq!(result.len(), 2);
        let u1 = result
            .iter()
            .find(|x| x.changelog().record_id == "u1")
            .unwrap();
        // The cross-iteration replacement: u1's cursor must be C3, not C1.
        assert_eq!(u1.changelog().cursor, c3);
        assert_matches!(
            u1,
            RowOrDelete::Row {
                row: Row::Unit(_),
                ..
            }
        );
    }

    #[actix_rt::test]
    async fn query_with_data_supersedes_across_iterations() {
        // Force the loop into a second iteration by injecting a missing-row
        // upsert in the first batch, then verify a later changelog
        // supersedes an entry we already materialized.
        //
        // Sequence:
        //   C1: u1 upsert (row exists)
        //   C2: u_missing upsert (no row)  <- skipped, keeps need > 0
        //   C3: u1 delete                  <- supersedes the C1 entry
        //   C4: u2 upsert (row exists)
        //
        // With limit=2, the first inner call returns C1+C2, materializes
        // {u1: Row}; the second call returns C3, supersedes u1 to Delete;
        // the third returns C4, fills the second slot.
        let (_, connection, _, _) = setup_all(
            "query_with_data_supersedes_across_iterations",
            MockDataInserts::none(),
        )
        .await;

        upsert_unit(&connection, "u1");
        insert_changelog(
            &connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u_missing".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
        );
        let c3 = delete_unit_changelog(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = ChangelogRepository::new(&connection).query_with_data(
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 2,
            },
        )
        .unwrap();

        assert_eq!(result.len(), 2);
        let u1 = result
            .iter()
            .find(|x| x.changelog().record_id == "u1")
            .unwrap();
        assert_eq!(u1.changelog().cursor, c3);
        assert_matches!(u1, RowOrDelete::Delete { .. });
        let u2 = result
            .iter()
            .find(|x| x.changelog().record_id == "u2")
            .unwrap();
        assert_matches!(
            u2,
            RowOrDelete::Row {
                row: Row::Unit(_),
                ..
            }
        );
    }
}
