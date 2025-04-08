#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use repository::{mock::MockDataInserts, StorageConnectionManager, SyncApiErrorCode};
    use reqwest::StatusCode;

    use util::assert_matches;

    use crate::{
        app_data::AppDataServiceTrait,
        service_provider::ServiceProvider,
        sync::{
            api::{ParsedError, SyncApiError, SyncApiErrorVariantV5, SyncErrorCodeV5},
            api_v6::{SyncApiErrorV6, SyncApiErrorVariantV6, SyncParsedErrorV6},
            central_data_synchroniser_v6::CentralPullErrorV6,
            settings::SyncSettings,
            sync_status::SyncLogError,
            synchroniser::{SyncError, Synchroniser},
            test::integration::{
                central_server_configurations::{ConfigureCentralServer, SiteConfiguration},
                create_site, FullSiteConfig,
            },
        },
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };

    fn get_synchroniser_with_hardware_id(
        connection_manager: &StorageConnectionManager,
        settings: &SyncSettings,
        hardware_id: &str,
    ) -> Synchroniser {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        struct TestService1(String);
        impl AppDataServiceTrait for TestService1 {
            fn get_hardware_id(&self) -> Result<String, std::io::Error> {
                Ok(self.0.clone())
            }
            fn set_hardware_id(&self, _: String) -> Result<(), std::io::Error> {
                unimplemented!()
            }
        }
        service_provider.app_data_service = Box::new(TestService1(hardware_id.to_string()));

        Synchroniser::new(settings.clone(), Arc::new(service_provider)).unwrap()
    }

    #[actix_rt::test]
    async fn integration_sync_parsed_error() {
        let FullSiteConfig {
            context:
                ServiceTestContext {
                    connection_manager,
                    service_provider,
                    service_context,
                    ..
                },

            config: SiteConfiguration { sync_settings, .. },
            ..
        } = create_site("sync_integration_test_parsed_error", vec![]).await;

        let hardware_id = service_provider.app_data_service.get_hardware_id().unwrap();
        let synchroniser =
            get_synchroniser_with_hardware_id(&connection_manager, &sync_settings, &hardware_id);

        synchroniser.sync(None).await.unwrap();

        // Change hardware id
        let synchroniser =
            get_synchroniser_with_hardware_id(&connection_manager, &sync_settings, "id2");

        let error = synchroniser
            .sync(None)
            .await
            .err()
            .expect("Should result in error");

        assert_matches!(
            error,
            SyncError::SyncApiError(SyncApiError {
                source: SyncApiErrorVariantV5::ParsedError {
                    status: StatusCode::UNAUTHORIZED,
                    ..
                },
                ..
            })
        );
        // Check that error is recorded in logs
        let status = service_provider
            .sync_status_service
            .get_latest_sync_status(&service_context)
            .unwrap()
            .expect("Sync log row should exist");

        assert_matches!(
            status.error,
            Some(SyncLogError {
                code: Some(SyncApiErrorCode::HardwareIdMismatch),
                ..
            })
        )
    }

    #[actix_rt::test]
    async fn api_incompatible_error() {
        let FullSiteConfig {
            context: ServiceTestContext {
                service_provider, ..
            },

            config: SiteConfiguration { sync_settings, .. },
            ..
        } = create_site("api_incompatible_error", vec![]).await;

        let synchroniser = Synchroniser::new_with_version(
            sync_settings.clone(),
            service_provider.clone(),
            10000,
            1,
        )
        .unwrap();

        let error = synchroniser
            .sync(None)
            .await
            .err()
            .expect("Should result in error");

        assert_matches!(
            error,
            SyncError::SyncApiError(SyncApiError {
                source: SyncApiErrorVariantV5::ParsedError {
                    status: StatusCode::CONFLICT,
                    source: ParsedError {
                        code: SyncErrorCodeV5::ApiVersionIncompatible,
                        data: Some(_),
                        ..
                    }
                },
                ..
            })
        );

        // V6
        let synchroniser =
            Synchroniser::new_with_version(sync_settings.clone(), service_provider, 2, 10000)
                .unwrap();

        let error = synchroniser
            .sync(None)
            .await
            .err()
            .expect("Should result in error");

        assert_matches!(
            error,
            SyncError::CentralPullErrorV6(CentralPullErrorV6::SyncApiError(SyncApiErrorV6 {
                source: SyncApiErrorVariantV6::ParsedError(SyncParsedErrorV6::SyncVersionMismatch(
                    0,
                    // Should match `SYNC_V6_VERSION` in server/service/src/sync/settings.rs
                    2, 10000
                )),
                ..
            }))
        );
    }

    // This test was checking for `html` type return from 4d server, this seems to be captured now
    // and AsText variant is returned
    //
    // #[actix_rt::test]
    // async fn integration_sync_not_parsed_error() {
    //     let central_config = ConfigureCentralServer::from_env();

    //     // Should result in an error in non standard format
    //     let error = match central_config
    //         .upsert_records(json!({
    //             "this_one_does_not_exist": [{"should_error":  true}]
    //         }))
    //         .await
    //     {
    //         Ok(_) => panic!("Should result in error"),
    //         Err(e) => e,
    //     };

    //     assert_matches!(
    //         error,
    //         SyncApiError {
    //             source: SyncApiErrorVariant::AsText {
    //                 status: StatusCode::INTERNAL_SERVER_ERROR,
    //                 ..
    //             },
    //             ..
    //         }
    //     );
    // }
}
