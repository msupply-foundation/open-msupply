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
        max_order_per_period -> Double,
    }
}

joinable!(program_requisition_order_type -> program_requisition_settings (program_requisition_settings_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "program_requisition_order_type"]
pub struct ProgramRequisitionOrderTypeRow {
    pub id: String,
    pub program_requisition_settings_id: String,
    pub name: String,
    pub threshold_mos: f64,
    pub max_mos: f64,
    pub max_order_per_period: f64,
}

pub struct ProgramRequisitionOrderTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRequisitionOrderTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRequisitionOrderTypeRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ProgramRequisitionOrderTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_requisition_order_type_dsl::program_requisition_order_type)
            .values(row)
            .on_conflict(program_requisition_order_type_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ProgramRequisitionOrderTypeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(program_requisition_order_type_dsl::program_requisition_order_type)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type_dsl::program_requisition_order_type
            .filter(program_requisition_order_type_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_program_and_name(
        &self,
        program_id: &str,
        name: &str,
    ) -> Result<Option<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type_dsl::program_requisition_order_type
            .inner_join(program_requisition_settings::table)
            .filter(program_requisition_settings::program_id.eq(program_id))
            .filter(program_requisition_order_type_dsl::name.eq(name))
            .select(
                program_requisition_order_type_dsl::program_requisition_order_type::all_columns(),
            )
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
