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

#[cfg(test)]
mod tests {
    use repository::{
        mock::{mock_store_a, mock_store_b, MockDataInserts},
        test_db::setup_all,
        StoreRowRepository,
    };

    use crate::{
        service_provider::ServiceProvider,
        site::upsert::{upsert_site, UpsertSite},
    };

    use super::*;

    fn new_site(id: i32) -> UpsertSite {
        UpsertSite {
            id,
            code: Some(format!("code{id}")),
            name: format!("Site {id}"),
            password: Some("password".to_string()),
            clear_hardware_id: false,
        }
    }

    #[actix_rt::test]
    async fn assign_stores_to_site_errors() {
        let (_, _, connection_manager, _) =
            setup_all("assign_stores_to_site_errors", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        assert_eq!(
            assign_stores_to_site(
                &context,
                AssignStoresToSite {
                    site_id: 999,
                    store_ids: vec!["store_a".to_string()],
                },
            ),
            Err(AssignStoresToSiteError::SiteDoesNotExist)
        );

        upsert_site(&context, new_site(2)).unwrap();
        assert_eq!(
            assign_stores_to_site(
                &context,
                AssignStoresToSite {
                    site_id: 2,
                    store_ids: vec!["missing".to_string()],
                },
            ),
            Err(AssignStoresToSiteError::StoreDoesNotExist(vec![
                "missing".to_string(),
            ]))
        );
    }

    #[actix_rt::test]
    async fn assign_stores_to_site_success() {
        let (_, _, connection_manager, _) = setup_all(
            "assign_stores_to_site_success",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.basic_context().unwrap();

        upsert_site(&context, new_site(7)).unwrap();
        assign_stores_to_site(
            &context,
            AssignStoresToSite {
                site_id: 7,
                store_ids: vec![mock_store_a().id, mock_store_b().id],
            },
        )
        .unwrap();

        let connection = connection_manager.connection().unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        assert_eq!(
            store_repo
                .find_one_by_id(&mock_store_a().id)
                .unwrap()
                .unwrap()
                .site_id,
            7
        );
        assert_eq!(
            store_repo
                .find_one_by_id(&mock_store_b().id)
                .unwrap()
                .unwrap()
                .site_id,
            7
        );
    }
}
