use std::collections::HashSet;

use super::{
    property_table_v2_row::property_table_v2, property_v2_row::property_v2, PropertyV2Row,
    StorageConnection,
};

use crate::{diesel_macros::apply_equal_filter, EqualFilter};
use crate::{repository_error::RepositoryError, DBType};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type PropertyV2 = PropertyV2Row;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct PropertyV2Filter {
    pub id: Option<EqualFilter<String>>,
    pub key: Option<EqualFilter<String>>,
    /// Restricts to properties that have a `property_table_v2` row for this
    /// table_name with `is_visible = true`.
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
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
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
        let query = Self::create_filtered_query(filter).order(property_v2::id.asc());

        let result = query.load::<PropertyV2>(self.connection.lock().connection())?;

        Ok(result)
    }

    /// Returns the set of property keys that are visible on the given table
    /// (`property_table_v2.is_visible = true`) and whose definition is not
    /// soft-deleted. Used by the NameNode resolver to pre-filter the JSONB
    /// blob to keys the client should ever see.
    pub fn allowed_keys_for_table(
        &self,
        target_table_name: &str,
    ) -> Result<HashSet<String>, RepositoryError> {
        let keys: Vec<String> = property_v2::table
            .inner_join(property_table_v2::table)
            .filter(property_v2::deleted_datetime.is_null())
            .filter(property_table_v2::table_name.eq(target_table_name))
            .filter(property_table_v2::is_visible.eq(true))
            .select(property_v2::key)
            .load(self.connection.lock().connection())?;

        Ok(keys.into_iter().collect())
    }

    pub fn create_filtered_query(filter: Option<PropertyV2Filter>) -> BoxedPropertyV2Query {
        // Soft-deleted property definitions are never surfaced via Stage 4
        // read paths. Reconsider if/when a config UI needs to manage them.
        let mut query = property_v2::table
            .filter(property_v2::deleted_datetime.is_null())
            .into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, property_v2::id);
            apply_equal_filter!(query, filter.key, property_v2::key);

            if let Some(table_name_filter) = filter.table_name {
                let allowed_ids = property_table_v2::table
                    .filter(property_table_v2::is_visible.eq(true))
                    .into_boxed();
                let allowed_ids = if let Some(value) = table_name_filter.equal_to {
                    allowed_ids.filter(property_table_v2::table_name.eq(value))
                } else if let Some(values) = table_name_filter.equal_any {
                    allowed_ids.filter(property_table_v2::table_name.eq_any(values))
                } else {
                    allowed_ids
                };
                query = query.filter(
                    property_v2::id
                        .eq_any(allowed_ids.select(property_table_v2::property_id)),
                );
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
        mock::MockDataInserts, test_db, PropertyTableV2Row, PropertyTableV2RowRepository,
        PropertyV2RowRepository, PropertyValueTypeV2,
    };

    fn property(id: &str, key: &str, deleted: bool) -> PropertyV2Row {
        PropertyV2Row {
            id: id.to_string(),
            key: key.to_string(),
            name: key.to_string(),
            value_type: PropertyValueTypeV2::Text,
            is_legacy: false,
            deleted_datetime: if deleted {
                Some(NaiveDate::from_ymd_opt(2024, 1, 1).unwrap().and_hms_opt(0, 0, 0).unwrap())
            } else {
                None
            },
        }
    }

    fn property_table(property_id: &str, table_name: &str, is_visible: bool) -> PropertyTableV2Row {
        PropertyTableV2Row {
            id: format!("{property_id}__{table_name}"),
            property_id: property_id.to_string(),
            table_name: table_name.to_string(),
            is_visible,
        }
    }

    async fn setup(suffix: &str) -> StorageConnection {
        let (_, connection, _, _) = test_db::setup_all(
            &format!("property_v2_repository_{suffix}"),
            MockDataInserts::none(),
        )
        .await;

        let prop_repo = PropertyV2RowRepository::new(&connection);
        prop_repo.upsert_one(&property("p_visible_name", "visible_name", false)).unwrap();
        prop_repo.upsert_one(&property("p_hidden_name", "hidden_name", false)).unwrap();
        prop_repo.upsert_one(&property("p_other_table", "other_table_only", false)).unwrap();
        prop_repo.upsert_one(&property("p_deleted", "deleted", true)).unwrap();

        let table_repo = PropertyTableV2RowRepository::new(&connection);
        table_repo.upsert_one(&property_table("p_visible_name", "name", true)).unwrap();
        table_repo.upsert_one(&property_table("p_hidden_name", "name", false)).unwrap();
        table_repo.upsert_one(&property_table("p_other_table", "store", true)).unwrap();
        table_repo.upsert_one(&property_table("p_deleted", "name", true)).unwrap();

        connection
    }

    #[actix_rt::test]
    async fn property_v2_query_excludes_soft_deleted_by_default() {
        let connection = setup("query_excludes_soft_deleted").await;
        let repo = PropertyV2Repository::new(&connection);

        let rows = repo.query(None).unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.id.clone()).collect();

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
        let ids: Vec<_> = rows.iter().map(|r| r.id.clone()).collect();

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
        assert_eq!(rows[0].id, "p_visible_name");
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

}
