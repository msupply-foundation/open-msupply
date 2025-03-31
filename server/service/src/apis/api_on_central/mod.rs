use repository::{NameStoreJoinRepository, NameStoreJoinRow, RepositoryError};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use util::format_error;

use crate::{service_provider::ServiceProvider, sync::CentralServerConfig};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NameStoreJoinParams {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
}

#[derive(Deserialize, Debug, Error, Serialize)]
pub enum CentralApiError {
    #[error("Not a central server")]
    NotACentralServer,
    #[error("Other server error: {0}")]
    OtherServerError(String),
}

impl From<RepositoryError> for CentralApiError {
    fn from(from: RepositoryError) -> Self {
        CentralApiError::OtherServerError(format_error(&from))
    }
}

/// Creates/updates a name_store_join for a patient
pub fn patient_name_store_join(
    service_provider: &ServiceProvider,
    NameStoreJoinParams {
        id,
        name_id,
        store_id,
    }: NameStoreJoinParams,
) -> Result<(), CentralApiError> {
    if !CentralServerConfig::is_central_server() {
        return Err(CentralApiError::NotACentralServer);
    }

    let ctx = service_provider.basic_context()?;
    let name_store_join_repo = NameStoreJoinRepository::new(&ctx.connection);

    // TODO: maybe should prevent this from creating a changelog? Let the OG one be source of truth?
    name_store_join_repo.upsert_one(&NameStoreJoinRow {
        id,
        store_id,
        // I think ideally would do a lookup and see if we have a name_link_id,
        // but should do the same as in sync translation
        name_link_id: name_id,

        // This is only used for adding patient visibility, so ok to set these here
        name_is_customer: true,
        name_is_supplier: false,
    })?;

    Ok(())
}
