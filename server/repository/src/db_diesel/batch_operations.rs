use futures_util::stream::TakeUntil;
use itertools::Itertools;

use crate::{
    syncv7::INTEGRATION_ORDER, BatchOperation, ChangelogTableName, DeleteOutcome, RepositoryError,
    Row, StorageConnection,
};

enum GroupedBatchOperations {
    

}

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

/// Postgres caps a statement at 65535 bind parameters; stay under it with headroom.
const PARAM_BUDGET: usize = 60000;

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
fn integration_rank(table_name: &ChangelogTableName) -> usize {
    INTEGRATION_ORDER
        .iter()
        .position(|t| t == table_name)
        .unwrap_or(usize::MAX)
}

fn attempt_upsert(con: &StorageConnection, upserts: Vec<(BatchOperation, Vec<T>)>, max_number_of_rows: usize) -> (Vec<(BatchOperation, Vec<T>)>, Option<RepositoryError>)

{
    let mut taken = Vec::new();
    if cfg!(feature = "postgres") {
        con.transaction_sync_etc(|sub| {
            taken = 
        }, false)
            .map_err(|e| e.to_inner_error())
    } else {
        f(con);
        Ok(())
    }
}

fn attempt<R, E, F>(con: &StorageConnection, f: F) -> Result<R, RepositoryError>
where
    F: FnOnce(&StorageConnection) -> Result<R, RepositoryError>,
{
    if cfg!(feature = "postgres") {
        con.transaction_sync_etc(|sub| f(sub), false)
            .map_err(|e| e.to_inner_error())
    } else {
        f(con)
    }
}

fn batch_operation<T>(
    con: &StorageConnection,
    operations: Vec<(BatchOperation, Vec<T>)>,
) -> Vec<(BatchOperation, Vec<T>, Option<RepositoryError>)> {
    let mut completed = Vec::new();
    let mut remaining = operations;
    // Infinite loop protection ?
    loop {
        // Exit when no more
        let Some(first) = &remaining.first() else {
            break;
        };
        let done = match &first.0 {
            BatchOperation::Upsert(row) => {
                let max_number_of_rows = match row.number_of_columns() {
                    0 => 1,
                    columns => (PARAM_BUDGET / columns).max(1),
                };

                match attempt(con, |con| {
                    Ok(row.batch_upsert(con, max_number_of_rows, &mut remaining))
                }) {
                    Ok(rows, extra, None) => remaining
                        .drain(0..number_of_rows)
                        .into_iter()
                        .map(|(op, extra)| (op, extra, None))
                        .collect(),
                    Err((_, number_of_rows)) => {
                        // Integrate one by one
                        remaining
                            .drain(0..number_of_rows)
                            .into_iter()
                            .map_while(|(op, extra)| match op {
                                BatchOperation::Upsert(row)
                                    if row.table_name() == first.0.table_name() =>
                                {
                                    Some(op, row, extra)
                                }
                                _ => None,
                            })
                            .map(|reference_row_row| {
                                match attempt_upsert(con, |con| {
                                    reference_row_row.batch_upsert(con, &vec![&reference_row_row])
                                }) {
                                    Ok(_) => (row, extra, None),
                                    Err((e, _)) => (row, extra, Some(e)),
                                }
                            })
                            .collect()
                    }
                }
            }
            BatchOperation::Delete { table_name, .. } => {
                let number_of_statements = PARAM_BUDGET;
                // Extract consequitive record ids matching this table_name
                let record_ids = remaining
                    .iter()
                    .take(number_of_statements)
                    .map_while(|(op, _)| match op {
                        BatchOperation::Delete {
                            record_id,
                            table_name: tn,
                        } if tn == table_name => Some(record_id.as_str()),
                        _ => None,
                    })
                    .collect::<Vec<&str>>();

                let err = match attempt_delete(con, |con| {
                    Row::batch_delete(con, table_name, &record_ids)
                }) {
                    Ok(DeleteOutcome::NoDeletePath) => Some(RepositoryError::as_db_error(
                        "Cannot delete record with this type",
                        Some(table_name),
                    )),
                    Err(e) => Some(e),
                    Ok(DeleteOutcome::Deleted) => None,
                };

                remaining
                    .drain(0..record_ids.len())
                    .into_iter()
                    .map(|(op, extra)| (op, extra, err.clone()))
                    .collect()
            }
        };
        completed.extend(done);
    }

    completed
}

pub fn batch_operations<T, D>(
    con: &StorageConnection,
    operations: Vec<BatchDbOperation<T, D>>,
) -> Vec<BatchDbOperationResult<T>>
where
    D: std::hash::Hash + Eq + Ord,
{
    let deduped_sorted_grouped = operations
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
        .sorted_by_key(|&(priority, is_upsert, table_name)| {
            let ranked = integration_rank(&table_name);

            (
                priority,
                is_upsert,
                if is_upsert { ranked } else { ranked * -1 },
            )
        })
        .map(|(_, group)| group)
        .collect();

    // Execute
    let mut results = Vec::new();
    for (_, group) in deduped_sorted_grouped {
        batch_operation
    }

    results
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
        let results = perform_batch_operations(&con, ops);

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
        let results = perform_batch_operations(&con, ops);

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
        let results = perform_batch_operations(&con, ops);

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
        let results = perform_batch_operations(&con, ops);

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
        let results = perform_batch_operations(
            &con,
            vec![delete("d1", "d1"), delete("d2", "d2"), delete("d3", "d3")],
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
        let results = perform_batch_operations(&con, ops);

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
}
