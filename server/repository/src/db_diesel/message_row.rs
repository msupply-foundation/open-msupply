use super::{
    store_row::store, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType,
    StorageConnection,
};
use crate::{RepositoryError, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
#[PgType = "message_status"]
pub enum MessageRowStatus {
    #[default]
    New,
    Processed,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
pub enum MessageRowType {
    #[default]
    RequestFieldChange,
    #[serde(untagged)]
    Other(String),
}

impl From<String> for MessageRowType {
    fn from(value: String) -> Self {
        serde_json::from_str(&value).unwrap_or_default()
    }
}

impl From<MessageRowType> for String {
    fn from(value: MessageRowType) -> Self {
        serde_json::to_string(&value).unwrap_or_default()
    }
}

table! {
    message (id) {
        id -> Text,
        to_store_id -> Text,
        from_store_id -> Nullable<Text>,
        body -> Text,
        created_datetime -> Timestamp,
        status -> crate::db_diesel::message_row::MessageRowStatusMapping,
        #[sql_name = "type"]
        type_ -> Text
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
    pub created_datetime: NaiveDateTime,
    pub status: MessageRowStatus,
    #[diesel(column_name = type_, serialize_as = String, deserialize_as = String)]
    pub r#type: MessageRowType,
}

pub struct MessageRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MessageRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MessageRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &MessageRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(message::table)
            .values(row.clone())
            .on_conflict(message::id)
            .do_update()
            .set(row.clone())
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row)
    }

    pub fn find_one_by_id(&self, message_id: &str) -> Result<Option<MessageRow>, RepositoryError> {
        let result = message::table
            .filter(message::id.eq(message_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn insert_changelog(&self, row: &MessageRow) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Message,
            record_id: row.id.clone(),
            row_action: RowActionType::Upsert,
            store_id: Some(row.to_store_id.clone()),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }
}

impl Upsert for MessageRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = MessageRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id)) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            MessageRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod tests {
    use util::assert_variant;

    use crate::{
        mock::{mock_store_a, MockDataInserts},
        test_db::{setup_test, SetupOption, SetupResult},
    };

    use super::*;

    #[actix_rt::test]
    async fn message_type() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("message_type"),
            inserts: MockDataInserts::none().names().stores(),
            ..Default::default()
        })
        .await;

        let message = MessageRow {
            id: "message1".to_string(),
            to_store_id: mock_store_a().id.clone(),
            r#type: MessageRowType::Other("SomethingNotInTheEnum".to_string()),
            ..Default::default()
        };
        MessageRowRepository::new(&connection)
            .upsert_one(&message)
            .unwrap();

        let found_message = assert_variant!(MessageRowRepository::new(&connection).find_one_by_id(&message.id), Ok(Some(msg)) => msg);
        assert_eq!(
            found_message.r#type,
            MessageRowType::Other("SomethingNotInTheEnum".to_string())
        );

        let message = MessageRow {
            id: "message2".to_string(),
            r#type: MessageRowType::RequestFieldChange,
            ..message
        };
        MessageRowRepository::new(&connection)
            .upsert_one(&message)
            .unwrap();

        let found_message = assert_variant!(MessageRowRepository::new(&connection).find_one_by_id(&message.id), Ok(Some(msg)) => msg);
        assert_eq!(found_message.r#type, MessageRowType::RequestFieldChange);
    }
}
