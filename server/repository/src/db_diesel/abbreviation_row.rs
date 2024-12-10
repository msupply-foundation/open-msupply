use super::abbreviation_row::abbreviation::dsl::*;
use crate::Delete;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    abbreviation (id) {
        id -> Text,
        text -> Text,
        expansion -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = abbreviation)]
#[diesel(treat_none_as_null = true)]
pub struct AbbreviationRow {
    pub id: String,
    pub text: String,
    pub expansion: String,
}

pub struct AbbreviationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AbbreviationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AbbreviationRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &AbbreviationRow) -> Result<(), RepositoryError> {
        diesel::insert_into(abbreviation)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AbbreviationRow>, RepositoryError> {
        let result = abbreviation.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        abbreviation_id: &str,
    ) -> Result<Option<AbbreviationRow>, RepositoryError> {
        let result = abbreviation
            .filter(id.eq(abbreviation_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, abbreviation_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(abbreviation.filter(id.eq(abbreviation_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for AbbreviationRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        AbbreviationRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AbbreviationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug)]
pub struct AbbreviationRowDelete(pub String);
impl Delete for AbbreviationRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        AbbreviationRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            AbbreviationRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
