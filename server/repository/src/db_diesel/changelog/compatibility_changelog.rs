use std::convert::TryInto;

use diesel::{dsl::IntoBoxed, prelude::*};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{diesel_macros::apply_equal_filter, DBType, EqualFilter, RepositoryError};

use super::{changelog::*, changelog_cursor_tracker::ChangelogCursorTracker};

// In upgrade to V7 we've change to using dynamic condition filtering
// However some plugins will still need to use this old changelog filtering
#[derive(Default, Clone, Serialize, Deserialize, Debug, TS)]
pub struct CompatibilityChangelogFilter {
    #[ts(optional)]
    pub table_name: Option<EqualFilter<ChangelogTableName>>,
    #[ts(optional)]
    pub store_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub record_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub action: Option<EqualFilter<RowActionType>>,
    #[ts(optional)]
    pub is_sync_update: Option<EqualFilter<bool>>,
    #[ts(optional)]
    pub source_site_id: Option<EqualFilter<i32>>,
}

impl<'a> ChangelogRepository<'a> {
    /// Returns up to `limit` changelog rows with a cursor **strictly greater than**
    /// `cursor`, in cursor order.
    ///
    /// The cursor semantics must match [`ChangelogRepository::query`]: callers (the
    /// processor loop in `service::processors::general_processor`) store the cursor of
    /// the last row they processed and pass it straight back in. An inclusive comparison
    /// here would hand that same row back on every call, and a plugin processor would
    /// re-process the newest matching row forever while starving every other processor.
    ///
    /// Like [`ChangelogRepository::query`], results are clamped to the
    /// [`ChangelogCursorTracker`] safe cursor, so a caller never advances past a row
    /// that an in-flight transaction may still commit below the rows returned.
    pub fn compatibility_query(
        &self,
        cursor: u64,
        limit: u32,
        filter: Option<CompatibilityChangelogFilter>,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let mut query = create_filtered_query(cursor, filter);

        if let Some(max_safe_cursor) = ChangelogCursorTracker::max_safe_cursor(self.connection) {
            query = query.filter(changelog_with_links::cursor.le(max_safe_cursor as i64));
        }

        let query = query
            .order(changelog_with_links::dsl::cursor.asc())
            .limit(limit.into());

        // // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result: Vec<ChangelogRow> = query.load(self.connection.lock().connection())?;
        Ok(result)
    }
}

type BoxedChangelogQuery = IntoBoxed<'static, changelog_with_links::table, DBType>;

fn create_base_query(cursor: u64) -> BoxedChangelogQuery {
    changelog_with_links::table
        // Strictly greater: `cursor` is the last row already processed (see
        // `compatibility_query`).
        .filter(changelog_with_links::cursor.gt(cursor.try_into().unwrap_or(0)))
        .into_boxed()
}

fn create_filtered_query(
    cursor: u64,
    filter: Option<CompatibilityChangelogFilter>,
) -> BoxedChangelogQuery {
    let mut query = create_base_query(cursor);

    if let Some(f) = filter {
        let CompatibilityChangelogFilter {
            table_name,
            store_id,
            record_id,
            is_sync_update,
            action,
            source_site_id,
        } = f;

        apply_equal_filter!(query, table_name, changelog_with_links::table_name);
        apply_equal_filter!(query, store_id, changelog_with_links::store_id);
        apply_equal_filter!(query, record_id, changelog_with_links::record_id);
        apply_equal_filter!(query, action, changelog_with_links::row_action);
        apply_equal_filter!(query, is_sync_update, changelog_with_links::is_sync_update);
        apply_equal_filter!(query, source_site_id, changelog_with_links::source_site_id);
    }

    query
}

impl CompatibilityChangelogFilter {
    pub fn new() -> Self {
        Default::default()
    }

    pub fn table_name(mut self, filter: EqualFilter<ChangelogTableName>) -> Self {
        self.table_name = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }

    pub fn action(mut self, filter: EqualFilter<RowActionType>) -> Self {
        self.action = Some(filter);
        self
    }

    pub fn is_sync_update(mut self, filter: EqualFilter<bool>) -> Self {
        self.is_sync_update = Some(filter);
        self
    }

    pub fn source_site_id(mut self, filter: EqualFilter<i32>) -> Self {
        self.source_site_id = Some(filter);
        self
    }
}

impl ChangelogTableName {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            not_equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

impl RowActionType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::MockDataInserts, test_db::setup_all, ChangeLogInsertRow, ChangelogRepository,
        ChangelogTableName, CompatibilityChangelogFilter, RowActionType,
    };

    fn insert_row(repo: &ChangelogRepository, table_name: ChangelogTableName, record_id: &str) {
        repo.insert(&ChangeLogInsertRow {
            table_name,
            record_id: record_id.to_string(),
            row_action: RowActionType::Upsert,
            store_id: None,
            source_site_id: None,
            transfer_store_id: None,
            patient_id: None,
        })
        .unwrap();
    }

    /// The processor loop stores the cursor of the last row it processed and passes it
    /// back in unchanged, so the compatibility query must be exclusive of `cursor`
    /// (the same contract as `ChangelogRepository::query`). Regression test for the
    /// plugin-processor infinite loop: with an inclusive comparison the last row is
    /// returned again on every call.
    #[actix_rt::test]
    async fn compatibility_query_is_exclusive_of_cursor() {
        let (_, connection, _, _) = setup_all(
            "compatibility_query_is_exclusive_of_cursor",
            MockDataInserts::none(),
        )
        .await;
        let repo = ChangelogRepository::new(&connection);
        let start = repo.max_cursor().unwrap();

        insert_row(&repo, ChangelogTableName::Invoice, "invoice_1");
        insert_row(&repo, ChangelogTableName::Location, "location_1");
        insert_row(&repo, ChangelogTableName::Invoice, "invoice_2");

        let invoices_only = Some(CompatibilityChangelogFilter {
            table_name: Some(ChangelogTableName::Invoice.equal_to()),
            ..Default::default()
        });

        // Unfiltered: everything after `start`, in order.
        let rows = repo.compatibility_query(start, 20, None).unwrap();
        assert_eq!(
            rows.iter()
                .map(|r| r.record_id.as_str())
                .collect::<Vec<_>>(),
            vec!["invoice_1", "location_1", "invoice_2"]
        );

        // Filtered, from `start`: both invoices.
        let rows = repo
            .compatibility_query(start, 20, invoices_only.clone())
            .unwrap();
        assert_eq!(
            rows.iter()
                .map(|r| r.record_id.as_str())
                .collect::<Vec<_>>(),
            vec!["invoice_1", "invoice_2"]
        );

        // Passing back the cursor of the row just processed must NOT return that row.
        let first_invoice_cursor = rows[0].cursor as u64;
        let rows = repo
            .compatibility_query(first_invoice_cursor, 20, invoices_only.clone())
            .unwrap();
        assert_eq!(
            rows.iter()
                .map(|r| r.record_id.as_str())
                .collect::<Vec<_>>(),
            vec!["invoice_2"]
        );

        // And once the last matching row has been processed the query drains to empty,
        // which is what lets the processor loop terminate.
        let last_invoice_cursor = rows[0].cursor as u64;
        let rows = repo
            .compatibility_query(last_invoice_cursor, 20, invoices_only)
            .unwrap();
        assert!(rows.is_empty(), "expected no rows, got {:?}", rows);
    }
}
