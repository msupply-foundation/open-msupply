use super::{
    clinician_row::clinician, invoice_line_row::invoice_line, invoice_row::invoice,
    master_list_line_row::master_list_line, master_list_row::master_list,
    name_link_row::name_link::dsl::*, name_row::name, store_row::store, StorageConnection,
};

use crate::{
    master_list_name_join::master_list_name_join, name_store_join::name_store_join,
    name_tag_join::name_tag_join, program_row::program, repository_error::RepositoryError,
};

use diesel::prelude::*;

table! {
    name_link (id) {
        id -> Text,
        name_id -> Text,
    }
}
joinable!(name_link -> name (name_id));
allow_tables_to_appear_in_same_query!(name_link, clinician);
allow_tables_to_appear_in_same_query!(name_link, invoice);
allow_tables_to_appear_in_same_query!(name_link, invoice_line);
allow_tables_to_appear_in_same_query!(name_link, master_list);
allow_tables_to_appear_in_same_query!(name_link, master_list_line);
allow_tables_to_appear_in_same_query!(name_link, master_list_name_join);
allow_tables_to_appear_in_same_query!(name_link, name_store_join);
allow_tables_to_appear_in_same_query!(name_link, name);
allow_tables_to_appear_in_same_query!(name_link, name_tag_join);
allow_tables_to_appear_in_same_query!(name_link, program);
allow_tables_to_appear_in_same_query!(name_link, store);

#[derive(Queryable, Insertable, Clone, Debug, PartialEq, AsChangeset, Eq)]
#[table_name = "name_link"]
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

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &NameLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_link)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &NameLinkRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name_link)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, row: &NameLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_link)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, item_link_id: &str) -> Result<NameLinkRow, RepositoryError> {
        let result = name_link
            .filter(name_link::id.eq(item_link_id))
            .first::<NameLinkRow>(&self.connection.connection)?;
        Ok(result)
    }
}
