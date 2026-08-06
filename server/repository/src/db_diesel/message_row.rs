use super::{store_row::store, RepositoryError, StorageConnection};
use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    message_group (id) {
        id -> Text,
        all_stores -> Bool,
    }
}

table! {
    message (id) {
        id -> Text,
        group_id -> Text,
        kind -> crate::db_diesel::message_row::MessageKindMapping,
        body -> Text,
        sender_store_id -> Text,
        sent_by_user_id -> Text,
        sent_datetime -> Timestamp,
        record_kind -> Nullable<Text>,
        record_id -> Nullable<Text>,
        linked_record_id -> Nullable<Text>,
    }
}

table! {
    message_recipient (id) {
        id -> Text,
        group_id -> Text,
        store_id -> Text,
        read_datetime -> Nullable<Timestamp>,
    }
}

joinable!(message -> message_group (group_id));
joinable!(message -> store (sender_store_id));
joinable!(message_recipient -> message_group (group_id));
joinable!(message_recipient -> store (store_id));
allow_tables_to_appear_in_same_query!(message, message_group);
allow_tables_to_appear_in_same_query!(message, message_recipient);
allow_tables_to_appear_in_same_query!(message_recipient, message_group);
allow_tables_to_appear_in_same_query!(message, store);

#[derive(
    diesel_derive_enum::DbEnum, Debug, Clone, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize,
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum MessageKind {
    #[default]
    Global,
    ByRecord,
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize,
)]
#[diesel(table_name = message_group)]
#[diesel(treat_none_as_null = true)]
pub struct MessageGroupRow {
    pub id: String,
    pub all_stores: bool,
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize,
)]
#[diesel(table_name = message)]
#[diesel(treat_none_as_null = true)]
pub struct MessageRow {
    pub id: String,
    pub group_id: String,
    pub kind: MessageKind,
    pub body: String,
    pub sender_store_id: String,
    pub sent_by_user_id: String,
    pub sent_datetime: NaiveDateTime,
    pub record_kind: Option<String>,
    /// The record this message is about, on the SENDER's side of the transfer.
    pub record_id: Option<String>,
    /// The counterpart record on the recipient's side (the linked requisition /
    /// linked shipment), so each store can open its OWN record from a message —
    /// see spec messaging › related records. Populated by the sender at compose
    /// time (it knows both sides); null for a global message or an unpaired
    /// record.
    pub linked_record_id: Option<String>,
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize,
)]
#[diesel(table_name = message_recipient)]
#[diesel(treat_none_as_null = true)]
pub struct MessageRecipientRow {
    pub id: String,
    pub group_id: String,
    pub store_id: String,
    pub read_datetime: Option<NaiveDateTime>,
}

pub struct MessageGroupRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MessageGroupRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MessageGroupRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &MessageGroupRow) -> Result<(), RepositoryError> {
        diesel::insert_into(message_group::table)
            .values(row)
            .on_conflict(message_group::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<MessageGroupRow>, RepositoryError> {
        match message_group::table
            .filter(message_group::id.eq(id))
            .first(self.connection.lock().connection())
        {
            Ok(row) => Ok(Some(row)),
            Err(diesel::result::Error::NotFound) => Ok(None),
            Err(error) => Err(RepositoryError::from(error)),
        }
    }
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

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<MessageRow>, RepositoryError> {
        match message::table
            .filter(message::id.eq(id))
            .first(self.connection.lock().connection())
        {
            Ok(row) => Ok(Some(row)),
            Err(diesel::result::Error::NotFound) => Ok(None),
            Err(error) => Err(RepositoryError::from(error)),
        }
    }

    pub fn check_exists_by_id(&self, lookup_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            message::table.filter(message::id.eq(lookup_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }
}

pub struct MessageRecipientRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MessageRecipientRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MessageRecipientRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &MessageRecipientRow) -> Result<(), RepositoryError> {
        diesel::insert_into(message_recipient::table)
            .values(row)
            .on_conflict(message_recipient::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_group_id(
        &self,
        group_id: &str,
    ) -> Result<Vec<MessageRecipientRow>, RepositoryError> {
        Ok(message_recipient::table
            .filter(message_recipient::group_id.eq(group_id))
            .load(self.connection.lock().connection())?)
    }

    /// The recipient row for one store in one group (the read-state carrier).
    pub fn find_one_by_group_and_store(
        &self,
        group_id: &str,
        store_id: &str,
    ) -> Result<Option<MessageRecipientRow>, RepositoryError> {
        match message_recipient::table
            .filter(message_recipient::group_id.eq(group_id))
            .filter(message_recipient::store_id.eq(store_id))
            .first(self.connection.lock().connection())
        {
            Ok(row) => Ok(Some(row)),
            Err(diesel::result::Error::NotFound) => Ok(None),
            Err(error) => Err(RepositoryError::from(error)),
        }
    }
}
