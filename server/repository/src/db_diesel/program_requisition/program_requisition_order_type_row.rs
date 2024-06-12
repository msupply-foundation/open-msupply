use super::{
    program_requisition_order_type_row::program_requisition_order_type::dsl as program_requisition_order_type_dsl,
    program_requisition_settings_row::program_requisition_settings,
};

use crate::{repository_error::RepositoryError, StorageConnection};

use diesel::prelude::*;

table! {
    program_requisition_order_type (id) {
        id -> Text,
        program_requisition_settings_id -> Text,
        name -> Text,
        threshold_mos -> Double,
        max_mos -> Double,
        max_order_per_period -> Integer,
    }
}
use crate::{Delete, Upsert};

joinable!(program_requisition_order_type -> program_requisition_settings (program_requisition_settings_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = program_requisition_order_type)]
pub struct ProgramRequisitionOrderTypeRow {
    pub id: String,
    pub program_requisition_settings_id: String,
    pub name: String,
    pub threshold_mos: f64,
    pub max_mos: f64,
    pub max_order_per_period: i32,
}

pub struct ProgramRequisitionOrderTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRequisitionOrderTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRequisitionOrderTypeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ProgramRequisitionOrderTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_requisition_order_type_dsl::program_requisition_order_type)
            .values(row)
            .on_conflict(program_requisition_order_type_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type_dsl::program_requisition_order_type
            .filter(program_requisition_order_type_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_program_requisition_settings_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type_dsl::program_requisition_order_type
            .filter(program_requisition_order_type_dsl::program_requisition_settings_id.eq_any(ids))
            .load(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn delete(&self, order_type_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            program_requisition_order_type_dsl::program_requisition_order_type
                .filter(program_requisition_order_type_dsl::id.eq(order_type_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ProgramRequisitionOrderTypeRowDelete(pub String);
impl Delete for ProgramRequisitionOrderTypeRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ProgramRequisitionOrderTypeRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ProgramRequisitionOrderTypeRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for ProgramRequisitionOrderTypeRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ProgramRequisitionOrderTypeRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ProgramRequisitionOrderTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
