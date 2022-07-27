use repository::{Encounter, EncounterFilter, EncounterRepository, RepositoryError};

use crate::service_provider::ServiceContext;

pub(crate) fn get_patient_program_encounters(
    ctx: &ServiceContext,
    filter: Option<EncounterFilter>,
) -> Result<Vec<Encounter>, RepositoryError> {
    EncounterRepository::new(&ctx.connection)
        .query_by_filter(filter.unwrap_or(EncounterFilter::new()))
}
