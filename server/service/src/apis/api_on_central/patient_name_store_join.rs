use log::{debug, error, info};
use repository::is_unnamed_patient_id;
use serde::{Deserialize, Serialize};
use tokio::time::{Duration, sleep};

use crate::{
    programs::patient::{
        add_patient_to_oms_central, patient_updated::activate_patient_name_store_join,
    },
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        CentralServerConfig,
        api::{SyncApiSettings, validate_site_auth},
    },
    validate::check_patient_exists,
};

use super::CentralApiError;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NameStoreJoinParams {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub sync_v5_settings: SyncApiSettings,
}

/// Creates/updates a name_store_join for a patient
pub async fn add_patient_name_store_join(
    service_provider: &ServiceProvider,
    NameStoreJoinParams {
        id,
        name_id,
        store_id,
        sync_v5_settings,
    }: NameStoreJoinParams,
) -> Result<(), CentralApiError> {
    if !CentralServerConfig::is_central_server() {
        return Err(CentralApiError::NotACentralServer);
    }

    let ctx = service_provider.basic_context()?;
    validate_site_auth(&ctx, &sync_v5_settings).await?;

    // A store's unnamed patient is never linked to another store
    // (spec/prescriptions rules › the unnamed patient), whatever the
    // remote's version
    if is_unnamed_patient_id(&name_id) {
        return Err(CentralApiError::InternalError(
            "The unnamed patient can't be linked to a store".to_string(),
        ));
    }

    // Check patient exists (see README in service/programs/patient)
    if check_patient_exists(&ctx.connection, &name_id)?.is_none() {
        info!(
            "Attempting to add name_store_join for a patient not visible on OMS Central, requesting patient data..."
        );

        add_patient_to_oms_central(service_provider, &ctx, &name_id)
            .await
            .map_err(|err| {
                error!("Failed to add patient to central: {err}");

                CentralApiError::InternalError("Error adding patient visibility".to_string())
            })?;

        wait_for_sync_of_patient_records(service_provider, &ctx, &name_id).await?;
    }

    activate_patient_name_store_join(&ctx.connection, &store_id, &name_id, Some(id))?;

    info!("Added patient {name_id} to store {store_id}");

    Ok(())
}

async fn wait_for_sync_of_patient_records(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    name_id: &str,
) -> Result<(), CentralApiError> {
    let timeout = Duration::from_secs(30);
    let start_time = tokio::time::Instant::now();

    loop {
        // Check if we've exceeded the timeout
        if start_time.elapsed() > timeout {
            error!("Timeout waiting for sync to complete");

            return Err(CentralApiError::InternalError(
                "Error adding patient visibility".to_string(),
            ));
        }

        // Brief pause to avoid busy loop, and hopefully give time for sync to start
        let duration = Duration::from_millis(1000);
        sleep(duration).await;

        let sync_status = match service_provider
            .sync_status_service
            .get_latest_sync_status(ctx)?
        {
            Some(sync_status) => sync_status,
            None => {
                error!("Could not find latest sync log");

                return Err(CentralApiError::InternalError(
                    "Error adding patient visibility".to_string(),
                ));
            }
        };

        // Potential race condition, sync is triggered in separate process so may not
        // have started syncing yet in first loop
        // More robust to check patient record has been received
        if !sync_status.is_syncing() {
            // If sync finished but integration of patient failed, will break after timeout
            if check_patient_exists(&ctx.connection, name_id)?.is_some() {
                info!("Patient data received");
                break;
            }
        }
        debug!("Patient not yet found, awaiting sync completion...");
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use httpmock::{Method::GET, MockServer};
    use repository::{
        EqualFilter, KeyType, KeyValueStoreRepository, NameStoreJoinFilter,
        NameStoreJoinRepository, mock::MockDataInserts, unnamed_patient_id,
    };

    use super::*;
    use crate::{
        sync::test_util_set_is_central_server, test_helpers::setup_all_and_service_provider,
    };

    // OMS-REG-DIS-12.211: an older site linking through the legacy central
    // server's path is refused too
    #[actix_rt::test]
    async fn linking_the_unnamed_patient_through_the_legacy_path_is_refused() {
        let context = setup_all_and_service_provider(
            "v6_link_unnamed_patient_refused",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);

        // The site authenticates against legacy mSupply first
        let legacy = MockServer::start();
        legacy.mock(|when, then| {
            when.method(GET).path("/sync/v5/site");
            then.status(200).body(
                r#"{
                    "id": "site",
                    "siteId": 2,
                    "code": "s2",
                    "name": "Site 2",
                    "initialisationStatus": "completed",
                    "isOmSupplyCentralServer": false,
                    "omSupplyCentralServerUrl": "",
                    "mSupplyCentralSiteId": 1
                }"#,
            );
        });
        KeyValueStoreRepository::new(&context.connection)
            .set_string(KeyType::SettingsSyncUrl, Some(legacy.base_url()))
            .unwrap();

        let unnamed = unnamed_patient_id("store_a");
        let result = add_patient_name_store_join(
            &context.service_provider,
            NameStoreJoinParams {
                id: "unnamed_join".to_string(),
                name_id: unnamed.clone(),
                store_id: "store_b".to_string(),
                sync_v5_settings: SyncApiSettings {
                    server_url: legacy.base_url(),
                    username: "site".to_string(),
                    password_sha256: "hash".to_string(),
                    site_uuid: "uuid".to_string(),
                    app_version: "1".to_string(),
                    app_name: "test".to_string(),
                    sync_version: "6".to_string(),
                },
            },
        )
        .await;
        assert!(
            matches!(result, Err(CentralApiError::InternalError(ref message)) if message.contains("unnamed patient")),
            "{result:?}"
        );
        assert!(
            NameStoreJoinRepository::new(&context.connection)
                .query_by_filter(NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(unnamed)))
                .unwrap()
                .is_empty()
        );
    }
}
