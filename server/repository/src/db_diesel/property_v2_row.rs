use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::RowActionType;
use crate::StorageConnection;
use crate::Upsert;

table! {
    property_v2 (id) {
        id -> Text,
        #[sql_name = "type"]
        type_ -> Text,
        name -> Text,
        translation_key -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_v2)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyV2Row {
    pub id: String,
    // String form of crate::types::PropertyV2Type — kept as String because the
    // column is TEXT (portable between SQLite and Postgres without an enum).
    #[diesel(column_name = type_)]
    pub r#type: String,
    pub name: String,
    pub translation_key: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct PropertyV2RowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyV2RowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyV2RowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyV2Row) -> Result<(), RepositoryError> {
        diesel::insert_into(property_v2::table)
            .values(row)
            .on_conflict(property_v2::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyV2Row) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        self.insert_changelog(row.id.to_string(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        record_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PropertyV2,
            record_id,
            row_action: action,
            store_id: None,
            name_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<PropertyV2Row>, RepositoryError> {
        let result = property_v2::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        property_id: &str,
    ) -> Result<Option<PropertyV2Row>, RepositoryError> {
        let result = property_v2::table
            .filter(property_v2::id.eq(property_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(
        &self,
        property_id: &str,
        deleted_at: NaiveDateTime,
    ) -> Result<(), RepositoryError> {
        diesel::update(property_v2::table.filter(property_v2::id.eq(property_id)))
            .set(property_v2::deleted_datetime.eq(Some(deleted_at)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for PropertyV2Row {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = PropertyV2RowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PropertyV2RowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
