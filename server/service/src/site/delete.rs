use crate::service_provider::ServiceContext;
use repository::{RepositoryError, SiteRowRepository};

#[derive(PartialEq, Debug)]
pub enum DeleteSiteError {
    SiteDoesNotExist,
    // TODO: Add check to prevent deletion of sites that have stores associated with them
    DatabaseError(RepositoryError),
}

pub fn delete_site(ctx: &ServiceContext, site_id: i32) -> Result<i32, DeleteSiteError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = SiteRowRepository::new(connection);

            repo.find_one_by_id(site_id)?
                .ok_or(DeleteSiteError::SiteDoesNotExist)?;

            repo.delete(site_id)?;
            Ok(site_id)
        })
        .map_err(|e| e.to_inner_error())
}

impl From<RepositoryError> for DeleteSiteError {
    fn from(error: RepositoryError) -> Self {
        DeleteSiteError::DatabaseError(error)
    }
}
