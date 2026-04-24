use super::{unit_row::unit::dsl::*, StorageConnection};
use crate::{
    db_diesel::changelog::{ChangeLogInsertRow, ChangelogRepository},
    repository_error::RepositoryError,
    ChangelogTableName, Delete, Upsert,
};
use diesel::prelude::*;

table! {
    unit (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        index -> Integer,
        is_active -> Bool,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = unit)]
pub struct UnitRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub index: i32,
    pub is_active: bool,
}

impl UnitRow {
    pub fn table_name() -> ChangelogTableName {
        ChangelogTableName::Unit
    }
    pub fn record_id(&self) -> String {
        self.id.clone()
    }
}

pub struct UnitRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UnitRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UnitRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &UnitRow) -> Result<(), RepositoryError> {
        diesel::insert_into(unit)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub async fn find_active_by_id(&self, unit_id: &str) -> Result<UnitRow, RepositoryError> {
        let result = unit
            .filter(id.eq(unit_id))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(&self, unit_id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        let result = unit
            .filter(id.eq(unit_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_inactive_by_id(&self, unit_id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        let result = unit
            .filter(id.eq(unit_id).and(is_active.eq(false)))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, unit_id: &str) -> Result<(), RepositoryError> {
        diesel::update(unit.filter(id.eq(unit_id)))
            .set(is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct UnitRowDelete(pub String);
impl Delete for UnitRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        UnitRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }
    fn delete_v7(
        &self,
        con: &StorageConnection,
        changelog: ChangeLogInsertRow,
    ) -> Result<(), RepositoryError> {
        UnitRowRepository::new(con).delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert!(matches!(
            UnitRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(UnitRow {
                is_active: false,
                ..
            })) | Ok(None)
        ));
    }
}

impl Upsert for UnitRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        UnitRowRepository::new(con).upsert_one(self)?;
        Ok(None)
    }
    fn upsert_v7(
        &self,
        con: &StorageConnection,
        changelog: ChangeLogInsertRow,
    ) -> Result<(), RepositoryError> {
        UnitRowRepository::new(con).upsert_one(self)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            UnitRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
