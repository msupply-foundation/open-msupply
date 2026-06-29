use std::collections::HashSet;

use diesel::prelude::*;

use crate::{
    db_diesel::{master_list_line_row::master_list_line, store_row::store},
    master_list_name_join::master_list_name_join,
    name_store_join::name_store_join,
    RepositoryError, StorageConnection,
};

use super::changelog::{ChangelogRow, ChangelogTableName};

/// Filters that are applied in Rust, after the changelog SQL window has loaded, rather than as
/// part of the changelog WHERE clause. They exist for distribution rules that can't be expressed
/// as a column filter on the changelog row alone — e.g. a `MasterList` row is keyless central data
/// (so the changelog query sends it everywhere) but should only reach a site where the master list
/// is actually *visible*.
///
/// Each filter is "dynamic" only in the sense that a given changelog query picks which filters to
/// apply (see `ChangelogRepository::query`). Within a query the set is fixed.
///
/// A filter only inspects rows of the table(s) it cares about — every variant first checks
/// `table_name` and passes through any row for an unrelated table untouched. So passing
/// `MasterListByVisibility` alongside `data_for_store`/`all_data_for_site` does not affect rows for
/// other tables.
#[derive(Debug, Clone, PartialEq)]
pub enum ApplicationFilter {
    /// Keep `MasterList` rows only if the master list (the changelog `record_id`) is visible in at
    /// least one of `visible_in_stores`. Rows for other tables pass through.
    MasterListByVisibility { visible_in_stores: Vec<String> },
    /// Keep `MasterListLine` rows only if the line's parent master list is visible in at least one
    /// of `visible_in_stores`. Rows for other tables pass through.
    ///
    /// The parent master list is resolved from `master_list_line.master_list_id`. A line whose row
    /// no longer exists (e.g. a `Delete` changelog) can't be resolved, so it is dropped — a site
    /// that can't see the master list never needs the line, deleted or not.
    MasterListLineByVisibility { visible_in_stores: Vec<String> },
}

impl ApplicationFilter {
    /// Apply every filter in `filters` to `rows`, in order, returning the surviving rows.
    pub fn apply_all(
        connection: &StorageConnection,
        filters: &[ApplicationFilter],
        rows: Vec<ChangelogRow>,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let mut rows = rows;
        for filter in filters {
            rows = filter.apply(connection, rows)?;
        }
        Ok(rows)
    }

    fn apply(
        &self,
        connection: &StorageConnection,
        rows: Vec<ChangelogRow>,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        match self {
            ApplicationFilter::MasterListByVisibility { visible_in_stores } => {
                self.filter_by_visible_master_list(connection, visible_in_stores, rows, |row| {
                    match row.table_name {
                        // For a MasterList row the record_id IS the master_list_id.
                        ChangelogTableName::MasterList => GovernedBy::MasterList(row.record_id.clone()),
                        _ => GovernedBy::NotGoverned,
                    }
                })
            }
            ApplicationFilter::MasterListLineByVisibility { visible_in_stores } => {
                // Resolve each MasterListLine record_id to its parent master_list_id up front, so
                // the row predicate is a cheap lookup rather than a per-row query.
                let line_ids: Vec<String> = rows
                    .iter()
                    .filter(|r| matches!(r.table_name, ChangelogTableName::MasterListLine))
                    .map(|r| r.record_id.clone())
                    .collect();
                let line_to_master_list = master_list_id_for_lines(connection, &line_ids)?;

                self.filter_by_visible_master_list(connection, visible_in_stores, rows, |row| {
                    match row.table_name {
                        ChangelogTableName::MasterListLine => {
                            // A line is governed even if its parent can't be resolved (e.g. a
                            // Delete whose row no longer exists) — an unresolved parent maps to a
                            // master list that is, by definition, not in the visible set, so the
                            // line is dropped.
                            match line_to_master_list.get(&row.record_id) {
                                Some(master_list_id) => {
                                    GovernedBy::MasterList(master_list_id.clone())
                                }
                                None => GovernedBy::MasterListUnresolved,
                            }
                        }
                        _ => GovernedBy::NotGoverned,
                    }
                })
            }
        }
    }

    /// Shared body for the master-list visibility filters.
    ///
    /// `classify` decides, per row, whether the filter governs it and against which master list:
    /// - `NotGoverned` — a row for an unrelated table; kept untouched.
    /// - `MasterList(id)` — a governed row; kept only when that master list is visible.
    /// - `MasterListUnresolved` — a governed row whose master list can't be resolved; always
    ///   dropped (a site that can't see the master list never needs the record).
    fn filter_by_visible_master_list(
        &self,
        connection: &StorageConnection,
        visible_in_stores: &[String],
        rows: Vec<ChangelogRow>,
        classify: impl Fn(&ChangelogRow) -> GovernedBy,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        // Classify every row once.
        let classified: Vec<(ChangelogRow, GovernedBy)> =
            rows.into_iter().map(|row| {
                let governed = classify(&row);
                (row, governed)
            }).collect();

        // Most windows carry no master list rows at all — skip the visibility query in that case.
        let has_governed_row = classified
            .iter()
            .any(|(_, g)| !matches!(g, GovernedBy::NotGoverned));
        if !has_governed_row {
            return Ok(classified.into_iter().map(|(row, _)| row).collect());
        }

        // Resolve the visible master list set once for the whole window.
        let visible = visible_master_list_ids(connection, visible_in_stores)?;

        Ok(classified
            .into_iter()
            .filter(|(_, governed)| match governed {
                GovernedBy::NotGoverned => true,
                GovernedBy::MasterList(master_list_id) => visible.contains(master_list_id),
                GovernedBy::MasterListUnresolved => false,
            })
            .map(|(row, _)| row)
            .collect())
    }
}

/// How a master-list visibility filter relates to a given changelog row.
enum GovernedBy {
    /// Row is for a table this filter doesn't touch — keep it.
    NotGoverned,
    /// Row is governed and maps to this master list — keep only if visible.
    MasterList(String),
    /// Row is governed but its master list can't be resolved — drop it.
    MasterListUnresolved,
}

/// Resolve `master_list_line.id -> master_list_id` for the given line ids.
fn master_list_id_for_lines(
    connection: &StorageConnection,
    line_ids: &[String],
) -> Result<std::collections::HashMap<String, String>, RepositoryError> {
    if line_ids.is_empty() {
        return Ok(Default::default());
    }
    let pairs: Vec<(String, String)> = master_list_line::table
        .filter(master_list_line::id.eq_any(line_ids))
        .select((master_list_line::id, master_list_line::master_list_id))
        .load(connection.lock().connection())?;
    Ok(pairs.into_iter().collect())
}

/// The set of master_list_ids visible in any of `store_ids`.
///
/// A master list is visible in a store when a `master_list_name_join` points at a name that is
/// visible in that store, where "visible in the store" is either:
///   1. the store's own name (`store.name_id`), or
///   2. a name made visible in the store via `name_store_join`.
///
/// Expressed as: `master_list_name_join.name_id IN ( <store names> UNION <name_store_join names> )`.
fn visible_master_list_ids(
    connection: &StorageConnection,
    store_ids: &[String],
) -> Result<HashSet<String>, RepositoryError> {
    if store_ids.is_empty() {
        return Ok(HashSet::new());
    }

    let store_ids = store_ids.to_vec();

    // (1) Names of the stores themselves.
    let store_names = store::table
        .filter(store::id.eq_any(store_ids.clone()))
        .select(store::name_id);

    // (2) Names made visible in those stores via name_store_join.
    let visible_names = name_store_join::table
        .filter(name_store_join::store_id.eq_any(store_ids))
        .select(name_store_join::name_id);

    let master_list_ids: Vec<String> = master_list_name_join::table
        .filter(
            master_list_name_join::name_id
                .eq_any(store_names)
                .or(master_list_name_join::name_id.eq_any(visible_names)),
        )
        .select(master_list_name_join::master_list_id)
        .distinct()
        .load(connection.lock().connection())?;

    Ok(master_list_ids.into_iter().collect())
}
