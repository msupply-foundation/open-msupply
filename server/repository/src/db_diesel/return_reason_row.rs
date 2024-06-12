use super::{return_reason_row::return_reason::dsl as return_reason_dsl, StorageConnection};

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;

table! {
    return_reason (id) {
        id -> Text,
        is_active -> Bool,
        reason -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = return_reason)]
pub struct ReturnReasonRow {
    pub id: String,
    pub is_active: bool,
    pub reason: String,
}

pub struct ReturnReasonRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReturnReasonRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReturnReasonRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ReturnReasonRow) -> Result<(), RepositoryError> {
        diesel::insert_into(return_reason_dsl::return_reason)
            .values(row)
            .on_conflict(return_reason_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ReturnReasonRow>, RepositoryError> {
        let result = return_reason_dsl::return_reason
            .filter(return_reason_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, return_reason_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(return_reason_dsl::return_reason)
            .filter(return_reason_dsl::id.eq(return_reason_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ReturnReasonRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ReturnReasonRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ReturnReasonRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
