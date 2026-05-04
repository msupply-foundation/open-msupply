use repository::{ancillary_item_row::AncillaryItemRowRepository, RepositoryError};

use crate::{service_provider::ServiceContext, sync::CentralServerConfig};

#[derive(PartialEq, Debug)]
pub enum DeleteAncillaryItemError {
    NotCentralServer,
    DatabaseError(RepositoryError),
}

pub struct DeleteAncillaryItem {
    pub id: String,
}

pub fn delete_ancillary_item(
    ctx: &ServiceContext,
    input: DeleteAncillaryItem,
) -> Result<String, DeleteAncillaryItemError> {
    if !CentralServerConfig::is_central_server() {
        return Err(DeleteAncillaryItemError::NotCentralServer);
    }

    ctx.connection
        .transaction_sync(|connection| {
            // Soft delete — `mark_deleted` updates `deleted_datetime` to now even if already set,
            // so re-deleting refreshes the timestamp
            AncillaryItemRowRepository::new(connection).mark_deleted(&input.id)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(input.id)
}

impl From<RepositoryError> for DeleteAncillaryItemError {
    fn from(error: RepositoryError) -> Self {
        DeleteAncillaryItemError::DatabaseError(error)
    }
}
