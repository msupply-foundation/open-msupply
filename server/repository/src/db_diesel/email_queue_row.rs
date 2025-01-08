use super::email_queue_row::email_queue::dsl::*;
use crate::{RepositoryError, StorageConnection, Upsert};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

table! {
    email_queue (id) {
        id -> Text,
        to_address -> Text,
        subject -> Text,
        html_body -> Text,
        text_body -> Text,
        status -> crate::db_diesel::email_queue_row::EmailQueueStatusMapping,
        created_at -> Timestamp,
        updated_at -> Timestamp,
        sent_at -> Nullable<Timestamp>,
        retries -> Integer,
        error -> Nullable<Text>,
        retry_at -> Nullable<Timestamp>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum EmailQueueStatus {
    Queued,
    Sent,
    Errored, // Errored will be re-tried
    Failed,  // Failed will NOT be re-tried
}

impl Default for EmailQueueStatus {
    fn default() -> Self {
        EmailQueueStatus::Queued
    }
}

#[derive(
    Clone, Queryable, Insertable, Identifiable, Debug, PartialEq, Eq, AsChangeset, Default,
)]
#[diesel(table_name = email_queue)]
pub struct EmailQueueRow {
    pub id: String,
    pub to_address: String,
    pub subject: String,
    pub html_body: String,
    pub text_body: String,
    pub status: EmailQueueStatus,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub sent_at: Option<NaiveDateTime>,
    pub retries: i32,
    pub error: Option<String>,
    pub retry_at: Option<NaiveDateTime>,
}

pub struct EmailQueueRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> EmailQueueRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        EmailQueueRowRepository { connection }
    }

    pub fn upsert_one(&self, email_queue_row: &EmailQueueRow) -> Result<(), RepositoryError> {
        diesel::insert_into(email_queue)
            .values(email_queue_row)
            .on_conflict(id)
            .do_update()
            .set(email_queue_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        email_queue_id: &str,
    ) -> Result<Option<EmailQueueRow>, RepositoryError> {
        let result = email_queue
            .filter(id.eq(email_queue_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn un_sent(&self) -> Result<Vec<EmailQueueRow>, RepositoryError> {
        let result = email_queue
            .filter(
                email_queue::status
                    .eq(EmailQueueStatus::Queued)
                    .or(email_queue::status
                        .eq(EmailQueueStatus::Errored)
                        .and(email_queue::retry_at.le(diesel::dsl::now))),
            )
            .load::<EmailQueueRow>(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for EmailQueueRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        EmailQueueRowRepository::new(con).upsert_one(self)?;
        Ok(None)
    }

    //Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            EmailQueueRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
