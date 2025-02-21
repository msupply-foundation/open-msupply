use chrono::NaiveDateTime;
use program::deleted_datetime;

use crate::{
    db_diesel::{
        context_row::context, document::document, master_list_row::master_list,
        name_link_row::name_link,
    },
    repository_error::RepositoryError,
    StorageConnection, Upsert,
};

use diesel::prelude::*;

table! {
    program (id) {
        id -> Text,
        master_list_id -> Nullable<Text>,
        name -> Text,
        context_id -> Text,
        is_immunisation -> Bool,
        elmis_code -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

joinable!(program -> master_list (master_list_id));
joinable!(program -> context (context_id));
allow_tables_to_appear_in_same_query!(program, document);
allow_tables_to_appear_in_same_query!(program, name_link);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq, Default)]
#[diesel(table_name = program)]
#[diesel(treat_none_as_null = true)]

pub struct ProgramRow {
    pub id: String, // Master list id
    pub master_list_id: Option<String>,
    pub name: String,
    pub context_id: String,
    pub is_immunisation: bool,
    pub elmis_code: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct ProgramRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ProgramRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program::table)
            .values(row)
            .on_conflict(program::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ProgramRow>, RepositoryError> {
        let result = program::table
            .filter(program::id.eq(id))
            .filter(deleted_datetime.is_null())
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::update(program::table.filter(program::id.eq(id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ProgramRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ProgramRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ProgramRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
