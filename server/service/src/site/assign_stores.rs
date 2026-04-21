use crate::service_provider::ServiceContext;
use repository::{RepositoryError, SiteRowRepository, StoreRowRepository};

#[derive(PartialEq, Debug)]
pub enum AssignStoresToSiteError {
    SiteDoesNotExist,
    StoreDoesNotExist(Vec<String>),
    DatabaseError(RepositoryError),
}

pub struct AssignStoresToSite {
    pub site_id: i32,
    pub store_ids: Vec<String>,
}

pub fn assign_stores_to_site(
    ctx: &ServiceContext,
    input: AssignStoresToSite,
) -> Result<Vec<String>, AssignStoresToSiteError> {
    ctx.connection
        .transaction_sync(|connection| {
            let site_repo = SiteRowRepository::new(connection);
            site_repo
                .find_one_by_id(input.site_id)?
                .ok_or(AssignStoresToSiteError::SiteDoesNotExist)?;

            let store_repo = StoreRowRepository::new(connection);

            let mut stores_to_update = Vec::with_capacity(input.store_ids.len());
            let mut missing = Vec::new();
            for store_id in &input.store_ids {
                match store_repo.find_one_by_id(store_id)? {
                    Some(store) => stores_to_update.push(store),
                    None => missing.push(store_id.clone()),
                }
            }

            if !missing.is_empty() {
                return Err(AssignStoresToSiteError::StoreDoesNotExist(missing));
            }

            for mut store in stores_to_update {
                store.site_id = input.site_id;
                store_repo.upsert_one(&store)?;
            }

            Ok(input.store_ids)
        })
        .map_err(|e| e.to_inner_error())
}

impl From<RepositoryError> for AssignStoresToSiteError {
    fn from(error: RepositoryError) -> Self {
        AssignStoresToSiteError::DatabaseError(error)
    }
}
