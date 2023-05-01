// TODO: Delete whole file when soft delete for master list is implemented
use repository::{
    MasterListRow, MasterListRowRepository, ProgramRow, ProgramRowRepository, RepositoryError,
};
use util::constants::MISSING_PROGRAM;

use crate::service_provider::ServiceProvider;

pub fn create_missing_master_list_and_program(
    service_provider: &ServiceProvider,
) -> Result<(), RepositoryError> {
    let missing_master_list = MasterListRow {
        id: MISSING_PROGRAM.to_string(),
        name: MISSING_PROGRAM.to_string(),
        code: MISSING_PROGRAM.to_string(),
        description: MISSING_PROGRAM.to_string(),
    };

    let missing_program = ProgramRow {
        id: MISSING_PROGRAM.to_string(),
        master_list_id: MISSING_PROGRAM.to_string(),
        name: MISSING_PROGRAM.to_string(),
    };

    let connection = service_provider.connection()?;

    MasterListRowRepository::new(&connection).upsert_one(&missing_master_list)?;
    ProgramRowRepository::new(&connection).upsert_one(&missing_program)?;

    Ok(())
}
