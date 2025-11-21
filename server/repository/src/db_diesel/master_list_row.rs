use super::{
    item_link_row::item_link, master_list_row::master_list::dsl::*, name_link_row::name_link,
    StorageConnection,
};

use crate::{
    repository_error::RepositoryError, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    RowActionType, Upsert,
};

use diesel::prelude::*;

table! {
    master_list (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        description -> Text,
        is_active -> Bool,
        is_default_price_list -> Bool,
        discount_percentage -> Nullable<Double>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
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
allow_tables_to_appear_in_same_query!(master_list, name_link);

pub struct MasterListRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &MasterListRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(master_list)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row)
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

    fn insert_changelog(&self, row: &MasterListRow) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::MasterList,
            record_id: row.id.clone(),
            row_action: RowActionType::Upsert,
            ..Default::default()
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }
}

impl Upsert for MasterListRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = MasterListRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
