use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use tokio::time::{sleep, Duration};

use crate::{
    programs::patient::{
        add_patient_to_oms_central, patient_updated::create_patient_name_store_join,
    },
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::{validate_site_auth, SyncApiSettings},
        sync_status::status::SyncStatusVariant,
        CentralServerConfig,
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

    // Check patient exists (see README in service/programs/patient)
    if check_patient_exists(&ctx.connection, &name_id)?.is_none() {
        info!(
            "Attempting to add name_store_join for a patient not visible on OMS Central, requesting patient data..."
       );

        add_patient_to_oms_central(service_provider, &ctx, &name_id)
            .await
            .map_err(|err| {
                error!("Failed to add patient to central: {}", err);

                CentralApiError::InternalError("Error adding patient visibility".to_string())
            })?;

        wait_for_sync_of_patient_records(service_provider, &ctx, &name_id).await?;
    }

    create_patient_name_store_join(&ctx.connection, &store_id, &name_id, Some(id))?;

    info!(
        "Created name_store_join for patient {} and store {}",
        name_id, store_id
    );

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

        match sync_status {
            SyncStatusVariant::Original(original) => {
                if !original.is_syncing {
                    // If sync finished but integration of patient failed, will break after timeout
                    if check_patient_exists(&ctx.connection, &name_id)?.is_some() {
                        info!("Patient data received");
                        break;
                    }
                }
            }
            _ => {
                // TODO
                break;
            }
        }
        debug!("Patient not yet found, awaiting sync completion...");
    }

    Ok(())
}
