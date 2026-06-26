use std::collections::{HashMap, HashSet};

use super::{
    property_table_v2_row::property_table_v2, property_v2_row::property_v2, PropertyDisplayModeV2,
    PropertyKindV2, PropertyV2Row, PropertyValueTypeV2, StorageConnection,
};

use crate::{diesel_macros::apply_equal_filter, EqualFilter};
use crate::{repository_error::RepositoryError, DBType};
use diesel::{dsl::IntoBoxed, prelude::*};

/// A property definition together with its per-scope display mode.
/// `display_mode` is populated only when the query is scoped to a single
/// `table_name` (the per-`(property, table)` mode lives on `property_table_v2`);
/// it is `None` for unscoped or multi-table queries.
#[derive(Clone, Default, PartialEq, Debug)]
pub struct PropertyV2 {
    pub property: PropertyV2Row,
    pub display_mode: Option<PropertyDisplayModeV2>,
}

/// Whether a property is surfaced to read paths. The `Other` catch-all on
/// either `value_type` or `kind` marks an unrecognised value from a newer
/// central (see [`PropertyValueTypeV2`] / [`PropertyKindV2`]): such properties
/// are tolerated in storage and sync for v7 forwards-compatibility, but never
/// displayed. Everything this build recognises is shown — matched exhaustively
/// (rather than against an allow-list) so a newly added known variant is
/// displayable by default instead of silently hidden until someone updates a
/// list. SQL can't express "not Other" (the catch-all holds arbitrary
/// strings), so this is applied in Rust over the loaded rows.
fn is_displayable(value_type: &PropertyValueTypeV2, kind: &PropertyKindV2) -> bool {
    !matches!(value_type, PropertyValueTypeV2::Other(_))
        && !matches!(kind, PropertyKindV2::Other(_))
}

#[derive(Clone, Default, PartialEq, Debug)]
pub struct PropertyV2Filter {
    pub id: Option<EqualFilter<String>>,
    pub key: Option<EqualFilter<String>>,
    /// Restricts to properties that have a `property_table_v2` row for this
    /// table_name whose `display_mode` is not `Hidden`.
    pub table_name: Option<EqualFilter<String>>,
}

pub struct PropertyV2Repository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyV2Repository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyV2Repository { connection }
    }

    pub fn count(&self, filter: Option<PropertyV2Filter>) -> Result<i64, RepositoryError> {
        // `Other` rows are excluded in Rust (see `is_displayable`), which a SQL
        // COUNT can't do — so count the filtered query result instead. The
        // property_v2 table is small (config definitions), so loading to count
        // is cheap.
        Ok(self.query(filter)?.len() as i64)
    }

    pub fn query_by_filter(
        &self,
        filter: PropertyV2Filter,
    ) -> Result<Vec<PropertyV2>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<PropertyV2Filter>,
    ) -> Result<Vec<PropertyV2>, RepositoryError> {
        // Per-scope display mode is only well-defined for a single-table scope,
        // so capture the requested table before `create_filtered_query` consumes
        // the filter.
        let scope_table = filter
            .as_ref()
            .and_then(|f| f.table_name.as_ref())
            .and_then(|t| t.equal_to.clone());

        let query = Self::create_filtered_query(filter).order(property_v2::id.asc());
        let rows = query.load::<PropertyV2Row>(self.connection.lock().connection())?;

        // When scoped to one table, fetch each property's display_mode for that
        // table so it can be surfaced per-scope (e.g. to drive toolbar promotion).
        let modes: HashMap<String, PropertyDisplayModeV2> = match &scope_table {
            Some(table_name) => property_table_v2::table
                .filter(property_table_v2::table_name.eq(table_name))
                .select((
                    property_table_v2::property_id,
                    property_table_v2::display_mode,
                ))
                .load::<(String, PropertyDisplayModeV2)>(self.connection.lock().connection())?
                .into_iter()
                .collect(),
            None => HashMap::new(),
        };

        // Unrecognised value_type/kind (`Other`) are hidden — see `is_displayable`.
        Ok(rows
            .into_iter()
            .filter(|property| is_displayable(&property.value_type, &property.kind))
            .map(|property| {
                let display_mode = modes.get(&property.id).cloned();
                PropertyV2 {
                    property,
                    display_mode,
                }
            })
            .collect())
    }

    /// Returns the set of property keys shown on the given table
    /// (`property_table_v2.display_mode != Hidden`) whose definition is not
    /// soft-deleted. Used by the NameNode resolver to pre-filter the JSONB
    /// blob to keys the client should ever see.
    pub fn allowed_keys_for_table(
        &self,
        target_table_name: &str,
    ) -> Result<HashSet<String>, RepositoryError> {
        let rows: Vec<(String, PropertyValueTypeV2, PropertyKindV2)> = property_v2::table
            .inner_join(property_table_v2::table)
            .filter(property_v2::deleted_datetime.is_null())
            .filter(property_table_v2::table_name.eq(target_table_name))
            .filter(property_table_v2::display_mode.ne(PropertyDisplayModeV2::Hidden))
            .select((property_v2::key, property_v2::value_type, property_v2::kind))
            .load(self.connection.lock().connection())?;

        // Unrecognised value_type/kind stay hidden — same rule as `query`.
        Ok(rows
            .into_iter()
            .filter(|(_, value_type, kind)| is_displayable(value_type, kind))
            .map(|(key, _, _)| key)
            .collect())
    }

    pub fn create_filtered_query(filter: Option<PropertyV2Filter>) -> BoxedPropertyV2Query {
        // Soft-deleted property definitions are never surfaced via Stage 4
        // read paths. Reconsider if/when a config UI needs to manage them.
        // Unrecognised value_type/kind (`Other`) are also hidden, but in Rust
        // (see `is_displayable`) — they're stored as their raw string, so SQL
        // can't tell them apart from known types here.
        let mut query = property_v2::table
            .filter(property_v2::deleted_datetime.is_null())
            .into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, property_v2::id);
            apply_equal_filter!(query, filter.key, property_v2::key);

            if let Some(table_name_filter) = filter.table_name {
                // `table_name` lives on the joined `property_table_v2` table (behind
                // `display_mode != Hidden`), so it can't go through `apply_equal_filter!` —
                // hence the hand-rolled subquery. See `PropertyV2Filter::table_name`
                // for which `EqualFilter` modes are honoured.
                let table_names = match (table_name_filter.equal_to, table_name_filter.equal_any) {
                    (Some(value), _) => Some(vec![value]),
                    (None, Some(values)) => Some(values),
                    (None, None) => None,
                };

                if let Some(table_names) = table_names {
                    let allowed_ids = property_table_v2::table
                        .filter(property_table_v2::display_mode.ne(PropertyDisplayModeV2::Hidden))
                        .filter(property_table_v2::table_name.eq_any(table_names))
                        .into_boxed();
                    query = query.filter(
                        property_v2::id.eq_any(allowed_ids.select(property_table_v2::property_id)),
                    );
                }
            }
        }

        query
    }
}

type BoxedPropertyV2Query = IntoBoxed<'static, property_v2::table, DBType>;

impl PropertyV2Filter {
    pub fn new() -> PropertyV2Filter {
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

    /// Restricts to properties visible on the given table(s).
    ///
    /// Only `equal_to` and `equal_any` are honoured — the negative/null
    /// `EqualFilter` modes have no well-defined meaning against the
    /// `property_table_v2` visibility join and are silently ignored (no
    /// `table_name` restriction is applied).
    pub fn table_name(mut self, filter: EqualFilter<String>) -> Self {
        self.table_name = Some(filter);
        self
    }
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

    use super::*;
    use crate::{
        mock::MockDataInserts, test_db, PropertyDisplayModeV2, PropertyKindV2, PropertyTableV2Row,
        PropertyTableV2RowRepository, PropertyV2RowRepository, PropertyValueTypeV2,
    };

    fn property(id: &str, key: &str, deleted: bool) -> PropertyV2Row {
        PropertyV2Row {
            id: id.to_string(),
            key: key.to_string(),
            name: key.to_string(),
            value_type: PropertyValueTypeV2::Text,
            kind: PropertyKindV2::Standard,
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

    fn property_table(
        property_id: &str,
        table_name: &str,
        display_mode: PropertyDisplayModeV2,
    ) -> PropertyTableV2Row {
        PropertyTableV2Row {
            id: format!("{property_id}__{table_name}"),
            property_id: property_id.to_string(),
            table_name: table_name.to_string(),
            display_mode,
        }
    }

    async fn setup(suffix: &str) -> StorageConnection {
        let (_, connection, _, _) = test_db::setup_all(
            &format!("property_v2_repository_{suffix}"),
            MockDataInserts::none(),
        )
        .await;

        let prop_repo = PropertyV2RowRepository::new(&connection);
        prop_repo
            .upsert_one(&property("p_visible_name", "visible_name", false))
            .unwrap();
        prop_repo
            .upsert_one(&property("p_hidden_name", "hidden_name", false))
            .unwrap();
        prop_repo
            .upsert_one(&property("p_other_table", "other_table_only", false))
            .unwrap();
        prop_repo
            .upsert_one(&property("p_deleted", "deleted", true))
            .unwrap();

        let table_repo = PropertyTableV2RowRepository::new(&connection);
        table_repo
            .upsert_one(&property_table(
                "p_visible_name",
                "name",
                PropertyDisplayModeV2::Visible,
            ))
            .unwrap();
        table_repo
            .upsert_one(&property_table(
                "p_hidden_name",
                "name",
                PropertyDisplayModeV2::Hidden,
            ))
            .unwrap();
        table_repo
            .upsert_one(&property_table(
                "p_other_table",
                "store",
                PropertyDisplayModeV2::Visible,
            ))
            .unwrap();
        table_repo
            .upsert_one(&property_table(
                "p_deleted",
                "name",
                PropertyDisplayModeV2::Visible,
            ))
            .unwrap();

        connection
    }

    #[actix_rt::test]
    async fn property_v2_query_excludes_soft_deleted_by_default() {
        let connection = setup("query_excludes_soft_deleted").await;
        let repo = PropertyV2Repository::new(&connection);

        let rows = repo.query(None).unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.property.id.clone()).collect();

        assert!(!ids.contains(&"p_deleted".to_string()));
        assert!(ids.contains(&"p_visible_name".to_string()));
    }

    #[actix_rt::test]
    async fn property_v2_query_by_table_name_returns_only_visible() {
        // Assert membership rather than exact equality, in case other `name`
        // table properties are present.
        let connection = setup("query_by_table_name").await;
        let repo = PropertyV2Repository::new(&connection);

        let rows = repo
            .query_by_filter(
                PropertyV2Filter::new().table_name(EqualFilter::equal_to("name".to_string())),
            )
            .unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.property.id.clone()).collect();

        assert!(ids.contains(&"p_visible_name".to_string()));
        assert!(!ids.contains(&"p_hidden_name".to_string()));
        assert!(!ids.contains(&"p_other_table".to_string()));
        assert!(!ids.contains(&"p_deleted".to_string()));
    }

    #[actix_rt::test]
    async fn property_v2_query_by_key() {
        let connection = setup("query_by_key").await;
        let repo = PropertyV2Repository::new(&connection);

        let rows = repo
            .query_by_filter(
                PropertyV2Filter::new().key(EqualFilter::equal_to("visible_name".to_string())),
            )
            .unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].property.id, "p_visible_name");
    }

    #[actix_rt::test]
    async fn property_v2_allowed_keys_for_table() {
        let connection = setup("allowed_keys_for_table").await;
        let repo = PropertyV2Repository::new(&connection);

        let keys = repo.allowed_keys_for_table("name").unwrap();

        assert!(keys.contains("visible_name"));
        // Hidden, soft-deleted, and other-table-scoped properties excluded.
        assert!(!keys.contains("hidden_name"));
        assert!(!keys.contains("deleted"));
        assert!(!keys.contains("other_table_only"));
    }

    #[actix_rt::test]
    async fn property_v2_count_matches_query() {
        let connection = setup("count_matches_query").await;
        let repo = PropertyV2Repository::new(&connection);

        let count = repo.count(None).unwrap();
        let rows = repo.query(None).unwrap();
        assert_eq!(count as usize, rows.len());
    }

    #[actix_rt::test]
    async fn property_v2_query_populates_per_scope_display_mode() {
        let connection = setup("display_mode_per_scope").await;

        // A property promoted (Prominent) on the "name" scope.
        PropertyV2RowRepository::new(&connection)
            .upsert_one(&property("p_prominent_name", "prominent_name", false))
            .unwrap();
        PropertyTableV2RowRepository::new(&connection)
            .upsert_one(&property_table(
                "p_prominent_name",
                "name",
                PropertyDisplayModeV2::Prominent,
            ))
            .unwrap();

        let repo = PropertyV2Repository::new(&connection);

        // Scoped to a single table: each returned property carries its
        // display_mode for that scope (this is what drives toolbar promotion on
        // the client).
        let scoped = repo
            .query_by_filter(
                PropertyV2Filter::new().table_name(EqualFilter::equal_to("name".to_string())),
            )
            .unwrap();
        let mode_of = |id: &str| {
            scoped
                .iter()
                .find(|r| r.property.id == id)
                .unwrap_or_else(|| panic!("missing {id} in scoped result"))
                .display_mode
                .clone()
        };
        assert_eq!(
            mode_of("p_prominent_name"),
            Some(PropertyDisplayModeV2::Prominent)
        );
        assert_eq!(mode_of("p_visible_name"), Some(PropertyDisplayModeV2::Visible));

        // An unscoped query has no single scope, so carries no per-scope mode.
        let unscoped = repo.query(None).unwrap();
        let prominent = unscoped
            .iter()
            .find(|r| r.property.id == "p_prominent_name")
            .unwrap();
        assert_eq!(prominent.display_mode, None);
    }

    #[actix_rt::test]
    async fn property_v2_query_excludes_unrecognised_kind_and_value_type() {
        // A property whose kind or value_type is an unrecognised value from a
        // newer central (the `Other` catch-all) is tolerated in storage/sync
        // for v7 forwards-compatibility, but must never appear in a read path.
        let (_, connection, _, _) = test_db::setup_all(
            "property_v2_query_excludes_unrecognised",
            MockDataInserts::none(),
        )
        .await;

        let prop_repo = PropertyV2RowRepository::new(&connection);
        let rows = [
            (
                "p_standard",
                "standard_key",
                PropertyValueTypeV2::Text,
                PropertyKindV2::Standard,
            ),
            (
                "p_other_kind",
                "other_kind_key",
                PropertyValueTypeV2::Text,
                PropertyKindV2::Other("FUTURE_KIND".to_string()),
            ),
            (
                "p_other_value_type",
                "other_value_type_key",
                PropertyValueTypeV2::Other("FUTURE_TYPE".to_string()),
                PropertyKindV2::Standard,
            ),
        ];
        let table_repo = PropertyTableV2RowRepository::new(&connection);
        for (id, key, value_type, kind) in rows {
            prop_repo
                .upsert_one(&PropertyV2Row {
                    id: id.to_string(),
                    key: key.to_string(),
                    name: key.to_string(),
                    value_type,
                    kind,
                    deleted_datetime: None,
                })
                .unwrap();
            table_repo
                .upsert_one(&property_table(id, "name", PropertyDisplayModeV2::Visible))
                .unwrap();
        }

        let repo = PropertyV2Repository::new(&connection);

        let ids: Vec<_> = repo
            .query(None)
            .unwrap()
            .into_iter()
            .map(|r| r.property.id)
            .collect();
        assert!(ids.contains(&"p_standard".to_string()));
        assert!(!ids.contains(&"p_other_kind".to_string()));
        assert!(!ids.contains(&"p_other_value_type".to_string()));

        // count() delegates to query(), so it excludes them too.
        assert_eq!(repo.count(None).unwrap() as usize, ids.len());

        // allowed_keys_for_table applies the same exclusion.
        let keys = repo.allowed_keys_for_table("name").unwrap();
        assert!(keys.contains("standard_key"));
        assert!(!keys.contains("other_kind_key"));
        assert!(!keys.contains("other_value_type_key"));
    }

    #[actix_rt::test]
    async fn property_v2_db_roundtrip_preserves_unknown_value_type() {
        // A value type unknown to this build (added on a newer central) must
        // survive a DB write→read unchanged. Without `#[strum(default,
        // transparent)]` on the `Other` catch-all, `to_sql` would persist the
        // literal "OTHER" and silently destroy the original value.
        let (_, connection, _, _) = test_db::setup_all(
            "property_v2_db_roundtrip_unknown_value_type",
            MockDataInserts::none(),
        )
        .await;

        let repo = PropertyV2RowRepository::new(&connection);
        let row = PropertyV2Row {
            id: "p_unknown_type".to_string(),
            key: "future_key".to_string(),
            name: "Future".to_string(),
            value_type: PropertyValueTypeV2::Other("FUTURE_TYPE".to_string()),
            kind: PropertyKindV2::Standard,
            deleted_datetime: None,
        };
        repo.upsert_one(&row).unwrap();

        let found = repo.find_one_by_id("p_unknown_type").unwrap().unwrap();
        assert_eq!(
            found.value_type,
            PropertyValueTypeV2::Other("FUTURE_TYPE".to_string())
        );
    }
}
