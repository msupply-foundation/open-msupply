use crate::service_provider::ServiceContext;
use repository::{RepositoryError, SiteRow, SiteRowRepository};

#[derive(PartialEq, Debug)]
pub enum ClearSiteTokenError {
    SiteDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn clear_site_token(ctx: &ServiceContext, site_id: i32) -> Result<i32, ClearSiteTokenError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = SiteRowRepository::new(connection);

            let site = repo
                .find_one_by_id(site_id)?
                .ok_or(ClearSiteTokenError::SiteDoesNotExist)?;

            repo.upsert(&SiteRow {
                token: None,
                ..site
            })?;
            Ok(site_id)
        })
        .map_err(|e| e.to_inner_error())
}

impl From<RepositoryError> for ClearSiteTokenError {
    fn from(error: RepositoryError) -> Self {
        ClearSiteTokenError::DatabaseError(error)
    }
}
