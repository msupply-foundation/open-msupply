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

#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all, SiteRowRepository};

    use crate::{
        service_provider::ServiceProvider,
        site::upsert::{upsert_site, UpsertSite},
    };

    use super::*;

    #[actix_rt::test]
    async fn delete_site_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_site_errors", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        assert_eq!(
            delete_site(&context, 999),
            Err(DeleteSiteError::SiteDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn delete_site_success() {
        let (_, _, connection_manager, _) =
            setup_all("delete_site_success", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.basic_context().unwrap();

        upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: Some("code1".to_string()),
                name: "Site A".to_string(),
                password: Some("password".to_string()),
                clear_hardware_id: false,
            },
        )
        .unwrap();
        delete_site(&context, 1).unwrap();

        let connection = connection_manager.connection().unwrap();
        let repo = SiteRowRepository::new(&connection);
        assert_eq!(repo.find_one_by_id(1).unwrap(), None);
    }
}
