use std::collections::{HashMap, HashSet};

use super::{
    custom_field_scope_row::custom_field_scope, custom_field_row::custom_field, CustomFieldDisplayMode,
    CustomFieldKind, CustomFieldRow, CustomFieldValueType, StorageConnection,
};

use crate::{diesel_macros::apply_equal_filter, EqualFilter};
use crate::{repository_error::RepositoryError, DBType};
use diesel::{dsl::IntoBoxed, prelude::*};

/// A custom_field definition together with its per-scope display mode.
/// `display_mode` is populated only when the query is scoped to a single
/// `scope` (the per-`(custom_field, table)` mode lives on `custom_field_scope`);
/// it is `None` for unscoped or multi-table queries.
#[derive(Clone, Default, PartialEq, Debug)]
pub struct CustomField {
    pub custom_field: CustomFieldRow,
    pub display_mode: Option<CustomFieldDisplayMode>,
}

/// Whether a custom_field is surfaced to read paths. The `Other` catch-all on
/// either `value_type` or `kind` marks an unrecognised value from a newer
/// central (see [`CustomFieldValueType`] / [`CustomFieldKind`]): such custom_fields
/// are tolerated in storage and sync for v7 forwards-compatibility, but never
/// displayed. Everything this build recognises is shown — matched exhaustively
/// (rather than against an allow-list) so a newly added known variant is
/// displayable by default instead of silently hidden until someone updates a
/// list. SQL can't express "not Other" (the catch-all holds arbitrary
/// strings), so this is applied in Rust over the loaded rows.
fn is_displayable(value_type: &CustomFieldValueType, kind: &CustomFieldKind) -> bool {
    !matches!(value_type, CustomFieldValueType::Other(_))
        && !matches!(kind, CustomFieldKind::Other(_))
}

#[derive(Clone, Default, PartialEq, Debug)]
pub struct CustomFieldFilter {
    pub id: Option<EqualFilter<String>>,
    pub key: Option<EqualFilter<String>>,
    /// Restricts to custom_fields that have a `custom_field_scope` row for this
    /// scope whose `display_mode` is not `Hidden`.
    pub scope: Option<EqualFilter<String>>,
}

pub struct CustomFieldRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CustomFieldRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CustomFieldRepository { connection }
    }

    pub fn count(&self, filter: Option<CustomFieldFilter>) -> Result<i64, RepositoryError> {
        // `Other` rows are excluded in Rust (see `is_displayable`), which a SQL
        // COUNT can't do — so count the filtered query result instead. The
        // custom_field table is small (config definitions), so loading to count
        // is cheap.
        Ok(self.query(filter)?.len() as i64)
    }

    pub fn query_by_filter(
        &self,
        filter: CustomFieldFilter,
    ) -> Result<Vec<CustomField>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<CustomFieldFilter>,
    ) -> Result<Vec<CustomField>, RepositoryError> {
        // Per-scope display mode is only well-defined for a single-table scope,
        // so capture the requested table before `create_filtered_query` consumes
        // the filter.
        let scope_table = filter
            .as_ref()
            .and_then(|f| f.scope.as_ref())
            .and_then(|t| t.equal_to.clone());

        let query = Self::create_filtered_query(filter).order(custom_field::id.asc());
        let rows = query.load::<CustomFieldRow>(self.connection.lock().connection())?;

        // When scoped to one table, fetch each custom_field's display_mode for that
        // table so it can be surfaced per-scope (e.g. to drive toolbar promotion).
        // Skip Hidden mappings to stay in lock-step with the main query (which
        // already excludes them) — those rows could never be matched anyway.
        let modes: HashMap<String, CustomFieldDisplayMode> = match &scope_table {
            Some(scope) => custom_field_scope::table
                .filter(custom_field_scope::scope.eq(scope))
                .filter(custom_field_scope::display_mode.ne(CustomFieldDisplayMode::Hidden))
                .select((
                    custom_field_scope::custom_field_id,
                    custom_field_scope::display_mode,
                ))
                .load::<(String, CustomFieldDisplayMode)>(self.connection.lock().connection())?
                .into_iter()
                .collect(),
            None => HashMap::new(),
        };

        // Unrecognised value_type/kind (`Other`) are hidden — see `is_displayable`.
        Ok(rows
            .into_iter()
            .filter(|custom_field| is_displayable(&custom_field.value_type, &custom_field.kind))
            .map(|custom_field| {
                let display_mode = modes.get(&custom_field.id).cloned();
                CustomField {
                    custom_field,
                    display_mode,
                }
            })
            .collect())
    }

    /// Returns the set of custom_field keys shown on the given table
    /// (`custom_field_scope.display_mode != Hidden`) whose definition is not
    /// soft-deleted. Used by the NameNode resolver to pre-filter the JSONB
    /// blob to keys the client should ever see.
    pub fn allowed_keys_for_scope(
        &self,
        target_scope: &str,
    ) -> Result<HashSet<String>, RepositoryError> {
        let rows: Vec<(String, CustomFieldValueType, CustomFieldKind)> = custom_field::table
            .inner_join(custom_field_scope::table)
            .filter(custom_field::deleted_datetime.is_null())
            .filter(custom_field_scope::scope.eq(target_scope))
            .filter(custom_field_scope::display_mode.ne(CustomFieldDisplayMode::Hidden))
            .select((custom_field::key, custom_field::value_type, custom_field::kind))
            .load(self.connection.lock().connection())?;

        // Unrecognised value_type/kind stay hidden — same rule as `query`.
        Ok(rows
            .into_iter()
            .filter(|(_, value_type, kind)| is_displayable(value_type, kind))
            .map(|(key, _, _)| key)
            .collect())
    }

    pub fn create_filtered_query(filter: Option<CustomFieldFilter>) -> BoxedCustomFieldQuery {
        // Soft-deleted custom_field definitions are never surfaced via Stage 4
        // read paths. Reconsider if/when a config UI needs to manage them.
        // Unrecognised value_type/kind (`Other`) are also hidden, but in Rust
        // (see `is_displayable`) — they're stored as their raw string, so SQL
        // can't tell them apart from known types here.
        let mut query = custom_field::table
            .filter(custom_field::deleted_datetime.is_null())
            .into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, custom_field::id);
            apply_equal_filter!(query, filter.key, custom_field::key);

            if let Some(scope_filter) = filter.scope {
                // `scope` lives on the joined `custom_field_scope` table (behind
                // `display_mode != Hidden`), so it can't go through `apply_equal_filter!` —
                // hence the hand-rolled subquery. See `CustomFieldFilter::scope`
                // for which `EqualFilter` modes are honoured.
                let scopes = match (scope_filter.equal_to, scope_filter.equal_any) {
                    (Some(value), _) => Some(vec![value]),
                    (None, Some(values)) => Some(values),
                    (None, None) => None,
                };

                if let Some(scopes) = scopes {
                    let allowed_ids = custom_field_scope::table
                        .filter(custom_field_scope::display_mode.ne(CustomFieldDisplayMode::Hidden))
                        .filter(custom_field_scope::scope.eq_any(scopes))
                        .into_boxed();
                    query = query.filter(
                        custom_field::id.eq_any(allowed_ids.select(custom_field_scope::custom_field_id)),
                    );
                }
            }
        }

        query
    }
}

type BoxedCustomFieldQuery = IntoBoxed<'static, custom_field::table, DBType>;

impl CustomFieldFilter {
    pub fn new() -> CustomFieldFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn key(mut self, filter: EqualFilter<String>) -> Self {
        self.key = Some(filter);
        self
    }

    /// Restricts to custom_fields visible on the given table(s).
    ///
    /// Only `equal_to` and `equal_any` are honoured — the negative/null
    /// `EqualFilter` modes have no well-defined meaning against the
    /// `custom_field_scope` visibility join and are silently ignored (no
    /// `scope` restriction is applied).
    pub fn scope(mut self, filter: EqualFilter<String>) -> Self {
        self.scope = Some(filter);
        self
    }
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

    use super::*;
    use crate::{
        mock::MockDataInserts, test_db, CustomFieldDisplayMode, CustomFieldKind, CustomFieldScopeRow,
        CustomFieldScopeRowRepository, CustomFieldRowRepository, CustomFieldValueType,
    };

    fn custom_field(id: &str, key: &str, deleted: bool) -> CustomFieldRow {
        CustomFieldRow {
            id: id.to_string(),
            key: key.to_string(),
            name: key.to_string(),
            value_type: CustomFieldValueType::Text,
            kind: CustomFieldKind::Standard,
            deleted_datetime: if deleted {
                Some(
                    NaiveDate::from_ymd_opt(2024, 1, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                )
            } else {
                None
            },
        }
    }

    fn custom_field_scope(
        custom_field_id: &str,
        scope: &str,
        display_mode: CustomFieldDisplayMode,
    ) -> CustomFieldScopeRow {
        CustomFieldScopeRow {
            id: format!("{custom_field_id}__{scope}"),
            custom_field_id: custom_field_id.to_string(),
            scope: scope.to_string(),
            display_mode,
        }
    }

    async fn setup(suffix: &str) -> StorageConnection {
        let (_, connection, _, _) = test_db::setup_all(
            &format!("custom_field_repository_{suffix}"),
            MockDataInserts::none(),
        )
        .await;

        let prop_repo = CustomFieldRowRepository::new(&connection);
        prop_repo
            .upsert_one(&custom_field("p_visible_name", "visible_name", false))
            .unwrap();
        prop_repo
            .upsert_one(&custom_field("p_hidden_name", "hidden_name", false))
            .unwrap();
        prop_repo
            .upsert_one(&custom_field("p_other_table", "other_table_only", false))
            .unwrap();
        prop_repo
            .upsert_one(&custom_field("p_deleted", "deleted", true))
            .unwrap();

        let table_repo = CustomFieldScopeRowRepository::new(&connection);
        table_repo
            .upsert_one(&custom_field_scope(
                "p_visible_name",
                "name",
                CustomFieldDisplayMode::Visible,
            ))
            .unwrap();
        table_repo
            .upsert_one(&custom_field_scope(
                "p_hidden_name",
                "name",
                CustomFieldDisplayMode::Hidden,
            ))
            .unwrap();
        table_repo
            .upsert_one(&custom_field_scope(
                "p_other_table",
                "store",
                CustomFieldDisplayMode::Visible,
            ))
            .unwrap();
        table_repo
            .upsert_one(&custom_field_scope(
                "p_deleted",
                "name",
                CustomFieldDisplayMode::Visible,
            ))
            .unwrap();

        connection
    }

    #[actix_rt::test]
    async fn custom_field_query_excludes_soft_deleted_by_default() {
        let connection = setup("query_excludes_soft_deleted").await;
        let repo = CustomFieldRepository::new(&connection);

        let rows = repo.query(None).unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.custom_field.id.clone()).collect();

        assert!(!ids.contains(&"p_deleted".to_string()));
        assert!(ids.contains(&"p_visible_name".to_string()));
    }

    #[actix_rt::test]
    async fn custom_field_query_by_scope_returns_only_visible() {
        // Assert membership rather than exact equality, in case other `name`
        // table custom_fields are present.
        let connection = setup("query_by_scope").await;
        let repo = CustomFieldRepository::new(&connection);

        let rows = repo
            .query_by_filter(
                CustomFieldFilter::new().scope(EqualFilter::equal_to("name".to_string())),
            )
            .unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.custom_field.id.clone()).collect();

        assert!(ids.contains(&"p_visible_name".to_string()));
        assert!(!ids.contains(&"p_hidden_name".to_string()));
        assert!(!ids.contains(&"p_other_table".to_string()));
        assert!(!ids.contains(&"p_deleted".to_string()));
    }

    #[actix_rt::test]
    async fn custom_field_query_by_key() {
        let connection = setup("query_by_key").await;
        let repo = CustomFieldRepository::new(&connection);

        let rows = repo
            .query_by_filter(
                CustomFieldFilter::new().key(EqualFilter::equal_to("visible_name".to_string())),
            )
            .unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].custom_field.id, "p_visible_name");
    }

    #[actix_rt::test]
    async fn custom_field_allowed_keys_for_scope() {
        let connection = setup("allowed_keys_for_scope").await;
        let repo = CustomFieldRepository::new(&connection);

        let keys = repo.allowed_keys_for_scope("name").unwrap();

        assert!(keys.contains("visible_name"));
        // Hidden, soft-deleted, and other-table-scoped custom_fields excluded.
        assert!(!keys.contains("hidden_name"));
        assert!(!keys.contains("deleted"));
        assert!(!keys.contains("other_table_only"));
    }

    #[actix_rt::test]
    async fn custom_field_count_matches_query() {
        let connection = setup("count_matches_query").await;
        let repo = CustomFieldRepository::new(&connection);

        let count = repo.count(None).unwrap();
        let rows = repo.query(None).unwrap();
        assert_eq!(count as usize, rows.len());
    }

    #[actix_rt::test]
    async fn custom_field_query_populates_per_scope_display_mode() {
        let connection = setup("display_mode_per_scope").await;

        // A custom_field promoted (Prominent) on the "name" scope.
        CustomFieldRowRepository::new(&connection)
            .upsert_one(&custom_field("p_prominent_name", "prominent_name", false))
            .unwrap();
        CustomFieldScopeRowRepository::new(&connection)
            .upsert_one(&custom_field_scope(
                "p_prominent_name",
                "name",
                CustomFieldDisplayMode::Prominent,
            ))
            .unwrap();

        let repo = CustomFieldRepository::new(&connection);

        // Scoped to a single table: each returned custom_field carries its
        // display_mode for that scope (this is what drives toolbar promotion on
        // the client).
        let scoped = repo
            .query_by_filter(
                CustomFieldFilter::new().scope(EqualFilter::equal_to("name".to_string())),
            )
            .unwrap();
        let mode_of = |id: &str| {
            scoped
                .iter()
                .find(|r| r.custom_field.id == id)
                .unwrap_or_else(|| panic!("missing {} in scoped result", id))
                .display_mode
                .clone()
        };
        assert_eq!(
            mode_of("p_prominent_name"),
            Some(CustomFieldDisplayMode::Prominent)
        );
        assert_eq!(mode_of("p_visible_name"), Some(CustomFieldDisplayMode::Visible));

        // An unscoped query has no single scope, so carries no per-scope mode.
        let unscoped = repo.query(None).unwrap();
        let prominent = unscoped
            .iter()
            .find(|r| r.custom_field.id == "p_prominent_name")
            .unwrap();
        assert_eq!(prominent.display_mode, None);
    }

    #[actix_rt::test]
    async fn custom_field_query_excludes_unrecognised_kind_and_value_type() {
        // A custom_field whose kind or value_type is an unrecognised value from a
        // newer central (the `Other` catch-all) is tolerated in storage/sync
        // for v7 forwards-compatibility, but must never appear in a read path.
        let (_, connection, _, _) = test_db::setup_all(
            "custom_field_query_excludes_unrecognised",
            MockDataInserts::none(),
        )
        .await;

        let prop_repo = CustomFieldRowRepository::new(&connection);
        let rows = [
            (
                "p_standard",
                "standard_key",
                CustomFieldValueType::Text,
                CustomFieldKind::Standard,
            ),
            (
                "p_other_kind",
                "other_kind_key",
                CustomFieldValueType::Text,
                CustomFieldKind::Other("FUTURE_KIND".to_string()),
            ),
            (
                "p_other_value_type",
                "other_value_type_key",
                CustomFieldValueType::Other("FUTURE_TYPE".to_string()),
                CustomFieldKind::Standard,
            ),
        ];
        let table_repo = CustomFieldScopeRowRepository::new(&connection);
        for (id, key, value_type, kind) in rows {
            prop_repo
                .upsert_one(&CustomFieldRow {
                    id: id.to_string(),
                    key: key.to_string(),
                    name: key.to_string(),
                    value_type,
                    kind,
                    deleted_datetime: None,
                })
                .unwrap();
            table_repo
                .upsert_one(&custom_field_scope(id, "name", CustomFieldDisplayMode::Visible))
                .unwrap();
        }

        let repo = CustomFieldRepository::new(&connection);

        let ids: Vec<_> = repo
            .query(None)
            .unwrap()
            .into_iter()
            .map(|r| r.custom_field.id)
            .collect();
        assert!(ids.contains(&"p_standard".to_string()));
        assert!(!ids.contains(&"p_other_kind".to_string()));
        assert!(!ids.contains(&"p_other_value_type".to_string()));

        // count() delegates to query(), so it excludes them too.
        assert_eq!(repo.count(None).unwrap() as usize, ids.len());

        // allowed_keys_for_scope applies the same exclusion.
        let keys = repo.allowed_keys_for_scope("name").unwrap();
        assert!(keys.contains("standard_key"));
        assert!(!keys.contains("other_kind_key"));
        assert!(!keys.contains("other_value_type_key"));
    }

    #[actix_rt::test]
    async fn custom_field_db_roundtrip_preserves_unknown_value_type() {
        // A value type unknown to this build (added on a newer central) must
        // survive a DB write→read unchanged. Without `#[strum(default,
        // transparent)]` on the `Other` catch-all, `to_sql` would persist the
        // literal "OTHER" and silently destroy the original value.
        let (_, connection, _, _) = test_db::setup_all(
            "custom_field_db_roundtrip_unknown_value_type",
            MockDataInserts::none(),
        )
        .await;

        let repo = CustomFieldRowRepository::new(&connection);
        let row = CustomFieldRow {
            id: "p_unknown_type".to_string(),
            key: "future_key".to_string(),
            name: "Future".to_string(),
            value_type: CustomFieldValueType::Other("FUTURE_TYPE".to_string()),
            kind: CustomFieldKind::Standard,
            deleted_datetime: None,
        };
        repo.upsert_one(&row).unwrap();

        let found = repo.find_one_by_id("p_unknown_type").unwrap().unwrap();
        assert_eq!(
            found.value_type,
            CustomFieldValueType::Other("FUTURE_TYPE".to_string())
        );
    }
}
