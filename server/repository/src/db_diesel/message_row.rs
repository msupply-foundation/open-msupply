use super::{store_row::store, StorageConnection};
use crate::{Delete, RepositoryError, Upsert};

use chrono::NaiveDate;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum MessageStatus {
    #[default]
    New,
    Read,
    Processed,
    Failed,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum MessageType {
    #[default]
    RequestFieldChange,
    Notification,
    Alert,
    Info,
}

table! {
    message (id) {
        id -> Text,
        to_store_id -> Text,
        from_store_id -> Nullable<Text>,
        body -> Text,
        created_date -> Date,
        created_time -> Integer,
        status -> crate::db_diesel::message_row::MessageStatusMapping,
        type_ -> crate::db_diesel::message_row::MessageTypeMapping,
    }
}

joinable!(message -> store (to_store_id));
allow_tables_to_appear_in_same_query!(message, store);

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = message)]
pub struct MessageRow {
    pub id: String,
    pub to_store_id: String,
    pub from_store_id: Option<String>,
    pub body: String,
    pub created_date: NaiveDate,
    pub created_time: i32,
    pub status: MessageStatus,
    #[diesel(column_name = type_)]
    pub r#type: MessageType,
}

pub struct MessageRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MessageRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MessageRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &MessageRow) -> Result<(), RepositoryError> {
        diesel::insert_into(message::table)
            .values(row)
            .on_conflict(message::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, message_id: &str) -> Result<Option<MessageRow>, RepositoryError> {
        let result = message::table
            .filter(message::id.eq(message_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<MessageRow>, RepositoryError> {
        let result = message::table
            .filter(message::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn all(&self) -> Result<Vec<MessageRow>, RepositoryError> {
        let result = message::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(message::table.filter(message::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct MessageRowDelete(pub String);
impl Delete for MessageRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        MessageRowRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            MessageRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for MessageRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        MessageRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            MessageRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
