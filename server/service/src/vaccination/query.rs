use repository::{
    EqualFilter, RepositoryError, Vaccination, VaccinationFilter, VaccinationRepository,
};

use crate::service_provider::ServiceContext;

pub fn get_vaccination(ctx: &ServiceContext, id: String) -> Result<Vaccination, RepositoryError> {
    let vaccination = VaccinationRepository::new(&ctx.connection)
        .query_one(VaccinationFilter::new().id(EqualFilter::equal_to(&id)))?;

    match vaccination {
        Some(vaccination) => Ok(vaccination),
        None => Err(RepositoryError::NotFound),
    }
}
