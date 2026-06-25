use itertools::Itertools;

use crate::{
    batch_delete, max_rows_per_chunk, syncv7::INTEGRATION_ORDER, BatchOperation,
    ChangelogTableName, RepositoryError, Row, StorageConnection,
};

/// A single DB operation to run as part of a batch. Generic over:
/// - `T` (`extra`): caller payload carried alongside the operation (e.g. a sync cursor). Because
///   operations are de-duplicated, the result groups all the `extra`s that collapsed together.
/// - `D` (`dedup_key`): how the caller decides two operations are "the same" (e.g. table+record_id).
pub struct BatchDbOperation<T, D> {
    /// Higher runs first. Within a priority, upserts run before deletes (see ordering below).
    pub priority: i32,
    pub operation: BatchOperation,
    pub extra: T,
    pub dedup_key: D,
}

impl BatchOperation {
    fn is_upsert(&self) -> bool {
        matches!(self, BatchOperation::Upsert(_))
    }

    fn table_name(&self) -> ChangelogTableName {
        match self {
            BatchOperation::Upsert(row) => row.table_name(),
            BatchOperation::Delete { table_name, .. } => table_name.clone(),
        }
    }
}

/// Result for one de-duplicated operation group, in execution order. Carries the `operation`
/// that ran, every input `extra` that shared the group's `(dedup_key, priority, op-type)`, and
/// `error` if it failed.
pub struct BatchDbOperationResult<T> {
    pub operation: BatchOperation,
    pub error: Option<RepositoryError>,
    pub extra: Vec<T>,
}

/// FK-order rank for a table (lower = integrated earlier). Tables missing from
/// `INTEGRATION_ORDER` sort last.
fn integration_rank(table_name: &ChangelogTableName) -> isize {
    INTEGRATION_ORDER
        .iter()
        .position(|t| t == table_name)
        .map(|pos| pos as isize)
        .unwrap_or(isize::MAX)
}

fn attempt_upsert<'a>(
    con: &StorageConnection,
    upserts: &[&'a BatchOperation],
    max_number_of_rows: usize,
    row: &'a Row,
    // Needed to populate default result
    op: &'a BatchOperation,
    wrap_record_in_tx: bool,
) -> (Vec<(&'a BatchOperation, &'a Row)>, Option<RepositoryError>) {
    if wrap_record_in_tx {
        match con.transaction_sync_etc(
            |tx_con| Ok(row.batch_upsert(tx_con, max_number_of_rows, &upserts)),
            false,
        ) {
            Ok(result) => result,
            // If transaction fails, do one by one starting with next op
            Err(e) => (vec![(op, row)], Some(e.into())),
        }
    } else {
        row.batch_upsert(con, max_number_of_rows, &upserts)
    }
}

fn attempt_delete<'a>(
    con: &StorageConnection,
    deletes: &[&'a BatchOperation],
    max_number_of_rows: usize,
    table_name: &'a ChangelogTableName,
    // Needed to populate default result
    op: &'a BatchOperation,
    wrap_record_in_tx: bool,
) -> (
    Vec<(&'a BatchOperation, &'a ChangelogTableName)>,
    Option<RepositoryError>,
) {
    // `batch_delete` returns a typed `BatchDeleteError` (so v7 can distinguish
    // `NoDeletePath`); here we just collapse it to a `RepositoryError`.
    let to_repo_error = |(ops, error): (
        Vec<(&'a BatchOperation, &'a ChangelogTableName)>,
        Option<crate::BatchDeleteError>,
    )| (ops, error.map(Into::into));

    if wrap_record_in_tx {
        match con.transaction_sync_etc(
            |tx_con| {
                Ok(to_repo_error(batch_delete(
                    tx_con,
                    table_name,
                    max_number_of_rows,
                    &deletes,
                )))
            },
            false,
        ) {
            Ok(result) => result,
            Err(e) => (vec![(op, table_name)], Some(e.into())),
        }
    } else {
        to_repo_error(batch_delete(con, table_name, max_number_of_rows, &deletes))
    }
}

fn batch_operation<'a>(
    con: &StorageConnection,
    operations: Vec<&'a BatchOperation>,
    wrap_record_in_tx: bool,
) -> Vec<Option<RepositoryError>> {
    let mut completed = Vec::new();
    while completed.len() < operations.len() {
        let remaining = &operations[completed.len()..];
        // Exit when no more
        let Some(first) = &remaining.first() else {
            break;
        };
        let done: Vec<Option<RepositoryError>> = match &first {
            BatchOperation::Upsert(row) => {
                // `number_of_columns() == 0` => variant isn't wired with `define_batch_table!`
                // (per-row fallback), so send one at a time; otherwise chunk under the budget.
                let max_number_of_rows = match row.number_of_columns() {
                    0 => 1,
                    columns => max_rows_per_chunk(columns),
                };

                match attempt_upsert(
                    con,
                    remaining,
                    max_number_of_rows,
                    &row,
                    first,
                    wrap_record_in_tx,
                ) {
                    (rows, None) => rows.into_iter().map(|_| None).collect(),
                    (rows, Some(_)) => rows
                        .into_iter()
                        .map(|(op, row)| {
                            attempt_upsert(con, &[op], 1, row, op, wrap_record_in_tx).1
                        })
                        .collect(),
                }
            }
            BatchOperation::Delete { table_name, .. } => {
                // A delete binds one param per id (`WHERE id IN (?, ?, ...)`).
                let max_number_of_rows = max_rows_per_chunk(1);
                // Extract consecutive record ids matching this table_name
                match attempt_delete(
                    con,
                    remaining,
                    max_number_of_rows,
                    &table_name,
                    first,
                    wrap_record_in_tx,
                ) {
                    (ops, None) => ops.into_iter().map(|_| None).collect(),
                    (ops, Some(_)) => ops
                        .into_iter()
                        .map(|(op, table_name)| {
                            attempt_delete(con, &[op], 1, table_name, op, wrap_record_in_tx).1
                        })
                        .collect(),
                }
            }
        };
        completed.extend(done.into_iter());
    }

    completed
}

pub fn batch_operations<T, D>(
    con: &StorageConnection,
    operations: Vec<BatchDbOperation<T, D>>,
    wrap_record_in_tx: bool,
) -> Vec<BatchDbOperationResult<T>>
where
    D: std::hash::Hash + Eq + Ord,
{
    let deduped_and_sorted: Vec<(BatchOperation, Vec<T>)> = operations
        .into_iter()
        .map(|op| {
            let BatchDbOperation {
                priority,
                operation,
                extra,
                dedup_key,
            } = op;

            (
                (
                    priority,
                    dedup_key,
                    operation.is_upsert(),
                    operation.table_name(),
                ),
                (operation, extra),
            )
        })
        // (p, d, u, t), vec(o, e))
        .into_group_map()
        .into_iter()
        // (p, u, t), (o.first, vec(e))
        .map(|((priority, _, is_upsert, table_name), group)| {
            let (operations, extras): (Vec<_>, Vec<_>) = group.into_iter().unzip();
            // There must be an element, safe to unwrap()
            (
                (priority, is_upsert, table_name),
                (operations.into_iter().last().unwrap(), extras),
            )
        })
        // (p, u, t), vec(o, vec(e))
        .sorted_by_key(|((priority, is_upsert, table_name), _)| {
            let ranked = integration_rank(table_name);

            // `sorted_by_key` is ascending, so wrap the descending keys in `Reverse`:
            // - highest priority first
            // - upserts (true) before deletes (false)
            // - within upserts: FK parents first (`ranked` asc); within deletes: children first
            //   (`-ranked` asc == `ranked` desc)
            (
                std::cmp::Reverse(*priority),
                std::cmp::Reverse(*is_upsert),
                if *is_upsert { ranked } else { ranked * -1 },
            )
        })
        .map(|(_, op_with_extra)| op_with_extra)
        .collect();

    // Execute
    let errors = batch_operation(
        con,
        deduped_and_sorted.iter().map(|(op, _)| op).collect(),
        wrap_record_in_tx,
    );

    // Merge errors in result
    deduped_and_sorted
        .into_iter()
        .zip(errors.into_iter())
        .map(|((operation, extra), error)| BatchDbOperationResult {
            operation,
            extra,
            error,
        })
        .collect()
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all, UnitRow, UnitRowRepository};

    fn unit(id: &str, name: &str) -> Row {
        Row::Unit(UnitRow {
            id: id.to_string(),
            name: name.to_string(),
            ..Default::default()
        })
    }

    fn upsert<T>(
        priority: i32,
        dedup_key: &str,
        extra: T,
        row: Row,
    ) -> BatchDbOperation<T, String> {
        BatchDbOperation {
            priority,
            operation: BatchOperation::Upsert(row),
            extra,
            dedup_key: dedup_key.to_string(),
        }
    }

    #[actix_rt::test]
    async fn batch_upserts_write_rows_and_group_extras() {
        let (_, con, _, _) =
            setup_all("perform_batch_operations_basic", MockDataInserts::none()).await;

        let ops = vec![
            upsert(0, "u1", 1usize, unit("u1", "one")),
            upsert(0, "u2", 2usize, unit("u2", "two")),
        ];
        let results = batch_operations(&con, ops, false);

        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|r| r.error.is_none()));
        // Each group carries its single extra and the operation that ran.
        assert_eq!(results[0].extra.len(), 1);
        assert!(results
            .iter()
            .all(|r| matches!(r.operation, BatchOperation::Upsert(Row::Unit(_)))));

        let repo = UnitRowRepository::new(&con);
        assert_eq!(repo.find_one_by_id("u1").unwrap().unwrap().name, "one");
        assert_eq!(repo.find_one_by_id("u2").unwrap().unwrap().name, "two");
    }

    #[actix_rt::test]
    async fn dedup_same_key_priority_optype_collects_extras() {
        let (_, con, _, _) =
            setup_all("perform_batch_operations_dedup", MockDataInserts::none()).await;

        // Same (dedup_key, priority, op-type) => one group; last operation kept, extras collected.
        let ops = vec![
            upsert(0, "u1", "first", unit("u1", "first")),
            upsert(0, "u1", "second", unit("u1", "second")),
            upsert(0, "u1", "third", unit("u1", "third")),
        ];
        let results = batch_operations(&con, ops, false);

        assert_eq!(results.len(), 1);
        let mut extras = results[0].extra.clone();
        extras.sort();
        assert_eq!(extras, vec!["first", "second", "third"]);

        // Last operation in the group is the one written.
        let written = UnitRowRepository::new(&con)
            .find_one_by_id("u1")
            .unwrap()
            .unwrap();
        assert_eq!(written.name, "third");
    }

    #[actix_rt::test]
    async fn higher_priority_runs_first() {
        let (_, con, _, _) =
            setup_all("perform_batch_operations_priority", MockDataInserts::none()).await;

        // Distinct records at different priorities => separate groups; higher priority first.
        let ops = vec![
            upsert(1, "u_low", "low", unit("u_low", "low")),
            upsert(5, "u_high", "high", unit("u_high", "high")),
        ];
        let results = batch_operations(&con, ops, false);

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].extra, vec!["high"]);
        assert_eq!(results[1].extra, vec!["low"]);

        let repo = UnitRowRepository::new(&con);
        assert!(repo.find_one_by_id("u_high").unwrap().is_some());
        assert!(repo.find_one_by_id("u_low").unwrap().is_some());
    }

    #[actix_rt::test]
    async fn delete_is_applied() {
        let (_, con, _, _) =
            setup_all("perform_batch_operations_delete", MockDataInserts::none()).await;

        UnitRowRepository::new(&con)
            ._upsert_one(&UnitRow {
                id: "u1".to_string(),
                name: "to_delete".to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        let ops: Vec<BatchDbOperation<(), String>> = vec![BatchDbOperation {
            priority: 0,
            operation: BatchOperation::Delete {
                table_name: ChangelogTableName::Unit,
                record_id: "u1".to_string(),
            },
            extra: (),
            dedup_key: "u1".to_string(),
        }];
        let results = batch_operations(&con, ops, false);

        assert_eq!(results.len(), 1);
        assert!(results[0].error.is_none());
        // Unit uses a soft delete: the row remains but is marked inactive.
        let row = UnitRowRepository::new(&con)
            .find_one_by_id("u1")
            .unwrap()
            .unwrap();
        assert!(!row.is_active);
    }

    fn delete(dedup_key: &str, id: &str) -> BatchDbOperation<(), String> {
        BatchDbOperation {
            priority: 0,
            operation: BatchOperation::Delete {
                table_name: ChangelogTableName::Unit,
                record_id: id.to_string(),
            },
            extra: (),
            dedup_key: dedup_key.to_string(),
        }
    }

    #[actix_rt::test]
    async fn deletes_are_batched() {
        let (_, con, _, _) = setup_all(
            "perform_batch_operations_batch_delete",
            MockDataInserts::none(),
        )
        .await;

        let repo = UnitRowRepository::new(&con);
        for id in ["d1", "d2", "d3"] {
            repo._upsert_one(&UnitRow {
                id: id.to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
        }

        // Three deletes of the same table => one batched `UPDATE ... WHERE id IN (...)`.
        let results = batch_operations(
            &con,
            vec![delete("d1", "d1"), delete("d2", "d2"), delete("d3", "d3")],
            false,
        );

        assert_eq!(results.len(), 3);
        assert!(results.iter().all(|r| r.error.is_none()));
        for id in ["d1", "d2", "d3"] {
            assert!(!repo.find_one_by_id(id).unwrap().unwrap().is_active);
        }
    }

    #[actix_rt::test]
    async fn upserts_then_deletes_ordered() {
        let (_, con, _, _) =
            setup_all("perform_batch_operations_mixed", MockDataInserts::none()).await;

        // Mix of upserts and deletes in one call; upserts run before deletes.
        let repo = UnitRowRepository::new(&con);
        repo._upsert_one(&UnitRow {
            id: "old".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();

        let ops = vec![
            delete("old", "old"),
            upsert(0, "new", (), unit("new", "new")),
        ];
        let results = batch_operations(&con, ops, false);

        assert_eq!(results.len(), 2);
        // Upsert is ordered first.
        assert!(matches!(results[0].operation, BatchOperation::Upsert(_)));
        assert!(matches!(
            results[1].operation,
            BatchOperation::Delete { .. }
        ));
        assert!(results.iter().all(|r| r.error.is_none()));
        assert!(repo.find_one_by_id("new").unwrap().is_some()); // upsert applied
        assert!(!repo.find_one_by_id("old").unwrap().unwrap().is_active); // delete (soft) applied
    }

    #[actix_rt::test]
    async fn no_delete_path_surfaces_error_per_group() {
        let (_, con, _, _) = setup_all(
            "perform_batch_operations_no_delete_path",
            MockDataInserts::none(),
        )
        .await;

        let repo = UnitRowRepository::new(&con);
        repo._upsert_one(&UnitRow {
            id: "u1".to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap();

        // A deletable table (Unit) and a non-deletable one (Barcode has no batch delete path).
        let ops: Vec<BatchDbOperation<&str, String>> = vec![
            BatchDbOperation {
                priority: 0,
                operation: BatchOperation::Delete {
                    table_name: ChangelogTableName::Unit,
                    record_id: "u1".to_string(),
                },
                extra: "unit",
                dedup_key: "u1".to_string(),
            },
            BatchDbOperation {
                priority: 0,
                operation: BatchOperation::Delete {
                    table_name: ChangelogTableName::Barcode,
                    record_id: "b1".to_string(),
                },
                extra: "barcode",
                dedup_key: "b1".to_string(),
            },
        ];
        let results = batch_operations(&con, ops, false);

        assert_eq!(results.len(), 2);
        let unit_result = results.iter().find(|r| r.extra == vec!["unit"]).unwrap();
        let barcode_result = results.iter().find(|r| r.extra == vec!["barcode"]).unwrap();
        // Unit delete succeeds; Barcode (no delete path) reports an error.
        assert!(unit_result.error.is_none());
        assert!(barcode_result.error.is_some());
        assert!(!repo.find_one_by_id("u1").unwrap().unwrap().is_active);
    }

    #[actix_rt::test]
    async fn larger_batch_upsert_writes_all() {
        let (_, con, _, _) = setup_all(
            "perform_batch_operations_larger_batch",
            MockDataInserts::none(),
        )
        .await;

        let ops: Vec<BatchDbOperation<(), String>> = (0..250)
            .map(|i| {
                upsert(
                    0,
                    &format!("u{i}"),
                    (),
                    unit(&format!("u{i}"), &format!("name{i}")),
                )
            })
            .collect();
        let results = batch_operations(&con, ops, false);

        assert_eq!(results.len(), 250);
        assert!(results.iter().all(|r| r.error.is_none()));

        let repo = UnitRowRepository::new(&con);
        assert_eq!(repo.find_one_by_id("u0").unwrap().unwrap().name, "name0");
        assert_eq!(
            repo.find_one_by_id("u249").unwrap().unwrap().name,
            "name249"
        );
    }

    fn item(id: &str, unit_id: Option<&str>) -> Row {
        Row::Item(crate::ItemRow {
            id: id.to_string(),
            name: id.to_string(),
            unit_id: unit_id.map(|u| u.to_string()),
            ..Default::default()
        })
    }

    /// A batched op that violates an FK must be isolated to that op WITHOUT poisoning the
    /// surrounding transaction. This reproduces the production failure: on Postgres a failed
    /// statement inside a savepoint aborts the (sub)transaction, and if the savepoint is
    /// RELEASEd (committed) instead of ROLLed BACK the whole outer tx is poisoned and its
    /// commit fails with "current transaction is aborted".
    ///
    /// Runs with `wrap_record_in_tx = true` (the Postgres path) INSIDE an outer
    /// `transaction_sync`, mirroring how the v5/v6 + v7 integrators call `batch_operations`.
    /// On SQLite this passes trivially (no poisoning); on Postgres it's the real regression guard.
    #[actix_rt::test]
    async fn fk_error_is_isolated_without_poisoning_outer_tx() {
        use crate::{ItemRowRepository, RepositoryError};

        let (_, con, _, _) = setup_all(
            "batch_operations_fk_error_isolation",
            MockDataInserts::none(),
        )
        .await;

        // A valid parent unit, a child item with a DANGLING unit_id (FK violation at the DB),
        // and a valid child item. Ordering within the batch shouldn't matter — batch_operations
        // sorts upserts FK-parents-first, and the bad item must not take down its siblings.
        let ops = vec![
            upsert(0, "u1", "unit", unit("u1", "one")),
            upsert(0, "bad", "item_bad", item("bad", Some("does_not_exist"))),
            upsert(0, "good", "item_good", item("good", Some("u1"))),
        ];

        // The whole thing runs in one outer transaction (as the integrators do). The key
        // assertion is that this transaction COMMITS — i.e. the FK failure was contained.
        let results = con
            .transaction_sync(|tx| -> Result<_, RepositoryError> {
                Ok(batch_operations(tx, ops, true))
            })
            .expect("outer transaction must commit — a contained FK error must not poison it");

        // The bad item errored; the unit and good item did not.
        let error_for = |key: &str| {
            results
                .iter()
                .find(|r| r.extra.iter().any(|e| *e == key))
                .map(|r| r.error.is_some())
        };
        assert_eq!(error_for("item_bad"), Some(true), "bad item should error");
        assert_eq!(error_for("unit"), Some(false), "unit should succeed");
        assert_eq!(error_for("item_good"), Some(false), "good item should succeed");

        // The good rows were actually written (committed with the outer tx).
        assert!(UnitRowRepository::new(&con)
            .find_one_by_id("u1")
            .unwrap()
            .is_some());
        let item_repo = ItemRowRepository::new(&con);
        assert!(item_repo.find_one_by_id("good").unwrap().is_some());
        assert!(
            item_repo.find_one_by_id("bad").unwrap().is_none(),
            "the FK-violating item must not have been written"
        );
    }
}
