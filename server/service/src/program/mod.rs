use super::{ListError, ListResult};
use crate::SingleRecordError;

use repository::{PaginationOption, programOptionsOrFilter, ProgramRow, ProgramSort, StorageConnection};

pub mod query;

#[cfg(test)]
mod test;

use query::{get_program, get_programs};

pub trait ProgramServiceTrait: Sync + Send {
    fn get_programs(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<programOptionsOrFilter>,
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
}

pub struct ProgramService {}
impl ProgramServiceTrait for ProgramService {}
