use super::{item_link_row::item_link, master_list_row::master_list::dsl::*, StorageConnection};

use crate::{
    diesel_macros::define_batch_table, repository_error::RepositoryError, ChangelogRepository,
    RowActionType, SourceSiteId,
};

use diesel::prelude::*;

define_batch_table! {
    struct: MasterListRow,
    repo: MasterListRowRepository,
    table: master_list (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        description -> Text,
        is_active -> Bool,
        is_default_price_list -> Bool,
        discount_percentage -> Nullable<Double>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = master_list)]
pub struct MasterListRow {
    pub id: String,
    pub name: String,
    pub code: String,
    pub description: String,
    pub is_active: bool,
    pub is_default_price_list: bool,
    pub discount_percentage: Option<f64>,
}

allow_tables_to_appear_in_same_query!(master_list, item_link);
pub struct MasterListRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &MasterListRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &MasterListRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = MasterListRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        master_list_id: &str,
    ) -> Result<Option<MasterListRow>, RepositoryError> {
        let result = master_list
            .filter(id.eq(master_list_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<MasterListRow>, RepositoryError> {
        Ok(master_list::table
            .filter(master_list::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn check_exists_by_id(&self, record_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            master_list::table.filter(master_list::id.eq(record_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }
}
