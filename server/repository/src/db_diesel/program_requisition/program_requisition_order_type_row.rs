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
    connection: &'a mut StorageConnection,
}

impl<'a> ProgramRequisitionOrderTypeRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        ProgramRequisitionOrderTypeRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ProgramRequisitionOrderTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_requisition_order_type_dsl::program_requisition_order_type)
            .values(row)
            .on_conflict(program_requisition_order_type_dsl::id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &mut self,
        row: &ProgramRequisitionOrderTypeRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(program_requisition_order_type_dsl::program_requisition_order_type)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &mut self,
        id: &str,
    ) -> Result<Option<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type_dsl::program_requisition_order_type
            .filter(program_requisition_order_type_dsl::id.eq(id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_program_requisition_settings_ids(
        &mut self,
        ids: &[String],
    ) -> Result<Vec<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type_dsl::program_requisition_order_type
            .filter(program_requisition_order_type_dsl::program_requisition_settings_id.eq_any(ids))
            .load(&mut self.connection.connection)?;

        Ok(result)
    }

    pub fn delete(&mut self, order_type_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            program_requisition_order_type_dsl::program_requisition_order_type
                .filter(program_requisition_order_type_dsl::id.eq(order_type_id)),
        )
        .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ProgramRequisitionOrderTypeRowDelete(pub String);
impl Delete for ProgramRequisitionOrderTypeRowDelete {
    fn delete(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        ProgramRequisitionOrderTypeRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &mut StorageConnection) {
        assert_eq!(
            ProgramRequisitionOrderTypeRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for ProgramRequisitionOrderTypeRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        ProgramRequisitionOrderTypeRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            ProgramRequisitionOrderTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
