use repository::{PreferenceRow, PreferenceRowRepository, RepositoryError};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq, Clone)]
pub struct UpsertPreference {
    pub id: String,
    pub store_id: Option<String>,
    pub key: String,
    pub value: String,
}

pub fn upsert_preference(
    ctx: &ServiceContext,
    UpsertPreference {
        id,
        store_id,
        key,
        value,
    }: UpsertPreference,
) -> Result<PreferenceRow, RepositoryError> {
    // TODO: validation here (i.e. can't set store pref where it is global only?)
    // more validation would be needed once we allow remote stores to set preferences
    ctx.connection
        .transaction_sync(|connection| {
            PreferenceRowRepository::new(connection).upsert_one(&PreferenceRow {
                id: id.clone(),
                store_id,
                key,
                value,
            })
        })
        .map_err(|error| error.to_inner_error())?;

    PreferenceRowRepository::new(&ctx.connection)
        .find_one_by_id(&id)?
        .ok_or(RepositoryError::NotFound)
}
