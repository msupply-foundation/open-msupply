use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, PreferenceRow, RepositoryError,
};

use crate::service_provider::ServiceContext;

use super::preferences::get_preference_descriptions;

pub struct PreferencesByKeyResult {
    pub global: Option<PreferenceRow>,
    pub per_store: Vec<PreferenceRow>,
    pub serialised_default: Option<String>,
}

pub fn get_preferences_by_key(
    ctx: &ServiceContext,
    key: &str,
) -> Result<PreferencesByKeyResult, RepositoryError> {
    let repo = PreferenceRepository::new(&ctx.connection);
    let filter = PreferenceFilter::new().key(EqualFilter::equal_to(key));

    let global = repo.query_one(filter.clone().store_id(EqualFilter::is_null(true)))?;

    let per_store = repo.query_by_filter(filter.store_id(EqualFilter::is_null(false)))?;

    let serialised_default = get_preference_descriptions()
        .iter()
        .find(|d| d.key() == key)
        .map(|p| p.serialised_default());

    Ok(PreferencesByKeyResult {
        global,
        per_store,
        serialised_default,
    })
}
