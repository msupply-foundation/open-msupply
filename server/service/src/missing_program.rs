use repository::{
    ContextRow, ContextRowRepository, MasterListRow, MasterListRowRepository, ProgramRow,
    ProgramRowRepository, RepositoryError,
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
        is_active: false,
    };

    let missing_context = ContextRow {
        id: MISSING_PROGRAM.to_string(),
        name: MISSING_PROGRAM.to_string(),
    };

    let missing_program = ProgramRow {
        id: MISSING_PROGRAM.to_string(),
        master_list_id: Some(MISSING_PROGRAM.to_string()),
        name: MISSING_PROGRAM.to_string(),
        context_id: MISSING_PROGRAM.to_string(),
        is_immunisation: false,
        deleted_datetime: None,
    };

    let connection = service_provider.connection()?;

    MasterListRowRepository::new(&connection).upsert_one(&missing_master_list)?;
    ContextRowRepository::new(&connection).upsert_one(&missing_context)?;
    ProgramRowRepository::new(&connection).upsert_one(&missing_program)?;

    Ok(())
}
