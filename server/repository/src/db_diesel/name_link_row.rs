use super::{name_link_row::name_link::dsl::*, name_row::name};

use crate::{RepositoryError, StorageConnection, Upsert};

use diesel::prelude::*;

table! {
    name_link (id) {
        id -> Text,
        name_id -> Text,
    }
}
joinable!(name_link -> name (name_id));

#[derive(Queryable, Insertable, Clone, Debug, PartialEq, AsChangeset, Eq, Default)]
#[diesel(table_name = name_link)]
pub struct NameLinkRow {
    pub id: String,
    pub name_id: String,
}

pub struct NameLinkRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameLinkRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameLinkRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &NameLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_link)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn insert_one_or_ignore(&self, row: &NameLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_link)
            .values(row)
            .on_conflict(name_link::id)
            .do_nothing()
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub async fn insert_one(&self, row: &NameLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_link)
            .values(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        name_link_id: &str,
    ) -> Result<Option<NameLinkRow>, RepositoryError> {
        let result = name_link
            .filter(name_link::id.eq(name_link_id))
            .first::<NameLinkRow>(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_name_id(&self, name: &str) -> Result<Vec<NameLinkRow>, RepositoryError> {
        let result = name_link
            .filter(name_id.eq(name))
            .load::<NameLinkRow>(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for NameLinkRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        NameLinkRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameLinkRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
