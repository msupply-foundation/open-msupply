use super::{
    backend_plugin_row::backend_plugin::dsl as backend_plugin_dsl, ChangeLogInsertRow,
    ChangelogRepository, ChangelogTableName, RowActionType, StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(Clone, Eq, PartialEq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PluginType {
    Amc,
}

#[derive(Clone, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
pub struct PluginTypes(pub Vec<PluginType>);

impl From<String> for PluginTypes {
    fn from(value: String) -> Self {
        serde_json::from_str(&value).unwrap_or_default()
    }
}

impl From<PluginTypes> for String {
    fn from(value: PluginTypes) -> Self {
        serde_json::to_string(&value).unwrap_or_default()
    }
}

#[derive(DbEnum, Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[cfg_attr(test, derive(strum::EnumIter))]
pub enum PluginVariantType {
    #[default]
    BoaJs,
}

table! {
  backend_plugin (id) {
      id -> Text,
      code -> Text,
      bundle_base64 -> Text,
      types -> Text,
      variant_type  -> crate::db_diesel::backend_plugin_row::PluginVariantTypeMapping,
  }
}

#[derive(
    Clone, Insertable, Default, Queryable, Debug, PartialEq, Eq, AsChangeset, Serialize, Deserialize,
)]
#[diesel(table_name = backend_plugin)]
pub struct BackendPluginRow {
    pub id: String,
    pub code: String,
    pub bundle_base64: String,
    #[diesel(serialize_as = String)]
    #[diesel(deserialize_as = String)]
    pub types: PluginTypes,
    pub variant_type: PluginVariantType,
}

pub struct BackendPluginRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BackendPluginRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BackendPluginRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<BackendPluginRow>, RepositoryError> {
        let result = backend_plugin_dsl::backend_plugin
            .filter(backend_plugin_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn all(&self) -> Result<Vec<BackendPluginRow>, RepositoryError> {
        let result = backend_plugin_dsl::backend_plugin
            .order_by(backend_plugin_dsl::id)
            .load(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn upsert_one(&self, row: BackendPluginRow) -> Result<i64, RepositoryError> {
        let id = row.id.clone();
        diesel::insert_into(backend_plugin_dsl::backend_plugin)
            .values(row.clone())
            .on_conflict(backend_plugin_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::BackendPlugin,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(id)?;
        let change_log_id = match old_row {
            Some(_) => self.insert_changelog(id, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };

        diesel::delete(backend_plugin_dsl::backend_plugin.filter(backend_plugin_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }
}

impl Upsert for BackendPluginRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = BackendPluginRowRepository::new(con).upsert_one(self.clone())?;
        Ok(Some(change_log))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            BackendPluginRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
// Most central data will be soft deleted (via upsert), and this trait will not be implemented
// backend_plugins don't have referencial relations to any other tables so it's ok to delete as an example
pub struct BackendPluginRowDelete(pub String);
impl Delete for BackendPluginRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = BackendPluginRowRepository::new(con).delete(&self.0)?;
        Ok(change_log_id)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            BackendPluginRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

#[cfg(test)]
mod test {
    use crate::{mock::MockDataInserts, test_db::setup_all};

    use super::*;
    use diesel::{sql_query, sql_types::Text};
    use strum::IntoEnumIterator;
    use util::assert_variant;

    #[actix_rt::test]
    async fn backend_plugin_row_enum() {
        let (_, connection, _, _) =
            setup_all("backend_plugin_row_enum", MockDataInserts::none()).await;

        let repo = BackendPluginRowRepository::new(&connection);
        // Try upsert all variants of Language, confirm that diesel enums match postgres
        for variant in PluginVariantType::iter() {
            let id = format!("{:?}", variant);
            let result = repo.upsert_one(BackendPluginRow {
                id: id.clone(),
                variant_type: variant.clone(),
                ..Default::default()
            });
            let _ = assert_variant!(result, Ok(_) => {});

            let result = repo.find_one_by_id(&id).unwrap().unwrap();
            assert_eq!(result.variant_type, variant);
        }
    }

    #[derive(QueryableByName)]
    struct Check {
        #[diesel(sql_type = Text)]
        types: String,
    }

    #[actix_rt::test]
    async fn backend_plugin_row() {
        let (_, connection, _, _) = setup_all("backend_plugin_row", MockDataInserts::none()).await;

        let repo = BackendPluginRowRepository::new(&connection);
        let id = "backend_plugin_row".to_string();

        let types = PluginTypes(vec![PluginType::Amc, PluginType::Amc]);
        let _ = repo.upsert_one(BackendPluginRow {
            id: id.clone(),
            types: types.clone(),
            ..Default::default()
        });

        let result = repo.find_one_by_id(&id).unwrap().unwrap();
        assert_eq!(result.types, types);

        let result: Vec<Check> = sql_query("SELECT types FROM backend_plugin")
            .load(connection.lock().connection())
            .unwrap();

        // Showing that types serializes to a readable text in DB field
        assert_eq!(result[0].types, r#"["AMC","AMC"]"#);
    }
}
