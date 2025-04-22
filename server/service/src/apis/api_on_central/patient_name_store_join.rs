use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use tokio::time::{sleep, Duration};
use util::format_error;

use crate::{
    apis::api_on_central::validate_site_auth,
    programs::patient::{
        link_patient_to_store, patient_updated::create_patient_name_store_join,
        CentralPatientRequestError,
    },
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::SyncApiSettings, ActiveStoresOnSite, CentralServerConfig, GetActiveStoresOnSiteError,
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
    validate_site_auth(sync_v5_settings).await?;

    // Check patient exists (see README in service/programs/patient)
    if check_patient_exists(&ctx.connection, &name_id)?.is_none() {
        info!(
        "Attempting to add name_store_join for a patient not visible on OMS Central, requesting patient data..."
    );
        add_patient_to_central(service_provider, &ctx, &name_id).await?;
    }

    create_patient_name_store_join(&ctx.connection, &store_id, &name_id, Some(id))?;

    info!(
        "Created name_store_join for patient {} and store {}",
        name_id, store_id
    );

    Ok(())
}

async fn add_patient_to_central(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    name_id: &str,
) -> Result<(), CentralApiError> {
    let central_store_id = ActiveStoresOnSite::get(&ctx.connection)?
        .store_ids()
        .first()
        .ok_or_else(|| {
            error!("No active stores found for this site");
            CentralApiError::InternalError("Central server misconfigured".to_string())
        })?
        .to_owned();

    // Add visibility for this patient to central site
    link_patient_to_store(service_provider, ctx, &central_store_id, name_id).await?;

    info!(
        "Created name_store_join for patient {} and central store {}",
        name_id, central_store_id
    );

    // TODO: possibly should check is not pre-initialisation here?
    service_provider.sync_trigger.trigger(None);
    info!("Sync cycle triggered to receive patient records");

    wait_for_sync(service_provider, &ctx, name_id).await?;

    Ok(())
}

async fn wait_for_sync(
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
        if !sync_status.is_syncing {
            // If sync finished but integration of patient failed, will break after timeout
            if check_patient_exists(&ctx.connection, &name_id)?.is_some() {
                info!("Patient data received");
                break;
            }
        }
        debug!("Patient not yet found, awaiting sync completion...");
    }

    Ok(())
}

impl From<GetActiveStoresOnSiteError> for CentralApiError {
    fn from(from: GetActiveStoresOnSiteError) -> Self {
        CentralApiError::InternalError(format_error(&from))
    }
}

impl From<CentralPatientRequestError> for CentralApiError {
    fn from(from: CentralPatientRequestError) -> Self {
        CentralApiError::InternalError(format_error(&from))
    }
}
