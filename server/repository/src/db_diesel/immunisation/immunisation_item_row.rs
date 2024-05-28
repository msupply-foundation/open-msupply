use super::immunisation_item_row::immunisation_item::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    immunisation_item (id) {
        id -> Text,
        immunisation_id -> Text,
        item_link_id -> Text,

    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = immunisation_item)]
pub struct ImmunisationItemRow {
    pub id: String,
    pub immunisation_id: String,
    pub item_link_id: String,
}

pub struct ImmunisationItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ImmunisationItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ImmunisationItemRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        immunisation_item_row: &ImmunisationItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(immunisation_item)
            .values(immunisation_item_row)
            .on_conflict(id)
            .do_update()
            .set(immunisation_item_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        immunisation_item_row: &ImmunisationItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(immunisation_item)
            .values(immunisation_item_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<ImmunisationItemRow>, RepositoryError> {
        let result = immunisation_item.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        immunisation_item_id: &str,
    ) -> Result<Option<ImmunisationItemRow>, RepositoryError> {
        let result = immunisation_item
            .filter(id.eq(immunisation_item_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, immunisation_item_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(immunisation_item)
            .filter(id.eq(immunisation_item_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
