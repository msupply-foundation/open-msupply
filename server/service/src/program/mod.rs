use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};

use repository::{PaginationOption, ProgramFilter, ProgramRow, ProgramSort, StorageConnection};

pub mod insert_immunisation;
pub mod query;
pub mod update_immunisation;
mod validate;

#[cfg(test)]
mod test;

use query::{get_program, get_programs};

pub trait ProgramServiceTrait: Sync + Send {
    fn get_programs(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<ProgramFilter>,
        sort: Option<ProgramSort>,
    ) -> Result<ListResult<ProgramRow>, ListError> {
        get_programs(connection, pagination, filter, sort)
    }

    fn get_program(
        &self,
        connection: &StorageConnection,
        id: String,
    ) -> Result<ProgramRow, SingleRecordError> {
        get_program(connection, id)
    }

    fn insert_immunisation_program(
        &self,
        ctx: &ServiceContext,
        input: insert_immunisation::InsertImmunisationProgram,
    ) -> Result<ProgramRow, insert_immunisation::InsertImmunisationProgramError> {
        insert_immunisation::insert_immunisation_program(ctx, input)
    }

    fn update_immunisation_program(
        &self,
        ctx: &ServiceContext,
        input: update_immunisation::UpdateImmunisationProgram,
    ) -> Result<ProgramRow, update_immunisation::UpdateImmunisationProgramError> {
        update_immunisation::update_immunisation_program(ctx, input)
    }
}

pub struct ProgramService {}
impl ProgramServiceTrait for ProgramService {}
