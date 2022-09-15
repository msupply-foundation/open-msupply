#[cfg(test)]
mod tests {
    use std::{io::Error, path::PathBuf};

    use actix_web::web::Data;
    use repository::{mock::MockDataInserts, test_db::setup_all, StorageConnectionManager};
    use reqwest::StatusCode;
    use serde_json::json;
    use util::assert_matches;

    use crate::{
        app_data::{AppData, AppDataServiceTrait},
        service_provider::ServiceProvider,
        sync::{
            api::{SyncApiError, SyncErrorV5},
            settings::SyncSettings,
            synchroniser::Synchroniser,
            test::integration::central_server_configurations::{ConfigureCentralServer, SiteConfiguration},
        },
    };

    fn get_synchroniser_with_hardware_id(
        connection_manager: &StorageConnectionManager,
        settings: &SyncSettings,
        hardware_id: &str,
    ) -> Synchroniser {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        struct TestService1(String);
        impl AppDataServiceTrait for TestService1 {
            fn get_app_data_directory(&self) -> Result<PathBuf, Error> {
                todo!()
            }
            fn get_app_data_file(&self) -> Result<PathBuf, Error> {
                todo!()
            }
            fn load_from_file(&self) -> Result<AppData, Error> {
                todo!()
            }
            fn get_hardware_id(&self) -> Result<String, Error> {
                Ok(self.0.clone())
            }
            fn set_hardware_id(&self, _: String) -> Result<(), Error> {
                todo!()
            }
        }
        service_provider.app_data_service = Box::new(TestService1(hardware_id.to_string()));

        Synchroniser::new(settings.clone(), Data::new(service_provider)).unwrap()
    }
    #[actix_rt::test]
    async fn integration_sync_parsed_error() {
        let SiteConfiguration { sync_settings, .. } = ConfigureCentralServer::from_env()
            .create_sync_site(vec![])
            .await
            .expect("Problem creating sync site");

        let (_, _, connection_manager, _) = setup_all(
            "sync_integration_test_parsed_error",
            MockDataInserts::none(),
        )
        .await;

        let synchroniser =
            get_synchroniser_with_hardware_id(&connection_manager, &sync_settings, "id1");
        synchroniser.sync().await.unwrap();

        // Change hardware id
        let synchroniser =
            get_synchroniser_with_hardware_id(&connection_manager, &sync_settings, "id2");

        let error = match synchroniser.sync().await {
            Ok(_) => panic!("Should result in error"),
            Err(e) => e,
        };

        println!("{}", error);

        assert_matches!(
            error.downcast_ref::<SyncApiError>(),
            Some(SyncApiError::MappedError {
                source: SyncErrorV5::ParsedError { .. },
                status: StatusCode::UNAUTHORIZED,
            })
        );
    }

    #[actix_rt::test]
    async fn integration_sync_not_parsed_error() {
        let central_config = ConfigureCentralServer::from_env();

        // Should result in an error in non standard format
        let error = match central_config
            .upsert_records(json!({
                "this_one_does_not_exist": [{"should_error":  true}]
            }))
            .await
        {
            Ok(_) => panic!("Should result in error"),
            Err(e) => e,
        };

        assert_matches!(
            error.downcast_ref::<SyncApiError>(),
            Some(SyncApiError::MappedError {
                source: SyncErrorV5::FullText(_),
                status: StatusCode::INTERNAL_SERVER_ERROR,
            })
        );
    }
}
