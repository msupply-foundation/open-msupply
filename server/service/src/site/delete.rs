use crate::service_provider::ServiceContext;
use repository::{
    EqualFilter, KeyType, KeyValueStoreRepository, RepositoryError, SiteRowRepository, StoreFilter,
    StoreRepository,
};

#[derive(PartialEq, Debug)]
pub enum DeleteSiteError {
    SiteDoesNotExist,
    SiteHasStores,
    CannotDeleteCentralSite,
    NotStandaloneCentral,
    DatabaseError(RepositoryError),
}

pub fn delete_site(ctx: &ServiceContext, site_id: i32) -> Result<i32, DeleteSiteError> {
    ctx.connection
        .transaction_sync(|connection| {
            let kv = KeyValueStoreRepository::new(connection);

            if kv.get_bool(KeyType::IsStandaloneCentral)? != Some(true) {
                return Err(DeleteSiteError::NotStandaloneCentral);
            }

            let repo = SiteRowRepository::new(connection);

            repo.find_one_by_id(site_id)?
                .ok_or(DeleteSiteError::SiteDoesNotExist)?;

            let central_site_id = kv.get_i32(KeyType::SettingsSyncCentralServerSiteId)?;
            if central_site_id == Some(site_id) {
                return Err(DeleteSiteError::CannotDeleteCentralSite);
            }

            let store_count = StoreRepository::new(connection).count(Some(
                StoreFilter::new().site_id(EqualFilter::equal_to(site_id)),
            ))?;
            if store_count > 0 {
                return Err(DeleteSiteError::SiteHasStores);
            }

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
    use super::*;
    use crate::{
        service_provider::ServiceProvider,
        site::{
            assign_stores::{assign_stores_to_site, AssignStoresToSite},
            upsert::{upsert_site, UpsertSite},
        },
    };
    use repository::{
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
        KeyType, KeyValueStoreRepository, SiteRowRepository,
    };

    #[actix_rt::test]
    async fn delete_site_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_site_errors",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        assert_eq!(
            delete_site(&context, 1),
            Err(DeleteSiteError::NotStandaloneCentral)
        );

        KeyValueStoreRepository::new(&context.connection)
            .set_bool(KeyType::IsStandaloneCentral, Some(true))
            .unwrap();

        assert_eq!(
            delete_site(&context, 999),
            Err(DeleteSiteError::SiteDoesNotExist)
        );

        upsert_site(
            &context,
            UpsertSite {
                id: 5,
                code: Some("test".to_string()),
                name: "test".to_string(),
                password: Some("password".to_string()),
                clear_hardware_id: false,
            },
        )
        .unwrap();
        assign_stores_to_site(
            &context,
            AssignStoresToSite {
                site_id: 5,
                store_ids: vec![mock_store_a().id],
            },
        )
        .unwrap();

        assert_eq!(
            delete_site(&context, 5),
            Err(DeleteSiteError::SiteHasStores)
        );

        upsert_site(
            &context,
            UpsertSite {
                id: 7,
                code: Some("central".to_string()),
                name: "Central".to_string(),
                password: Some("password".to_string()),
                clear_hardware_id: false,
            },
        )
        .unwrap();
        KeyValueStoreRepository::new(&context.connection)
            .set_i32(KeyType::SettingsSyncCentralServerSiteId, Some(7))
            .unwrap();
        assert_eq!(
            delete_site(&context, 7),
            Err(DeleteSiteError::CannotDeleteCentralSite)
        );
    }

    #[actix_rt::test]
    async fn delete_site_success() {
        let (_, _, connection_manager, _) =
            setup_all("delete_site_success", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.basic_context().unwrap();

        KeyValueStoreRepository::new(&context.connection)
            .set_bool(KeyType::IsStandaloneCentral, Some(true))
            .unwrap();

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
