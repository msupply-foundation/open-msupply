use repository::RepositoryError;
use reqwest::ClientBuilder;
use thiserror::Error;
use url::Url;

use crate::{
    apis::{
        api_on_central::NameStoreJoinParams,
        oms_central::OmsCentralApi,
        patient_v4::{
            NameStoreJoinParamsV4, NameStoreJoinV2, PatientApiV4, PatientParamsV4, PatientV4,
        },
    },
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::SyncApiV5,
        settings::{SyncSettings, SYNC_V5_VERSION},
        CentralServerConfig,
    },
};

use super::PatientSearch;

#[derive(Error, Debug)]
pub enum CentralPatientRequestError {
    #[error(transparent)]
    DatabaseError(RepositoryError),
    #[error("Internal error: {0}")]
    InternalError(String),
    #[error("Connection error: {0}")]
    ConnectionError(String),
}

pub async fn patient_search_central(
    sync_settings: &SyncSettings,
    params: PatientSearch,
) -> Result<Vec<PatientV4>, CentralPatientRequestError> {
    let central_server_url = Url::parse(&sync_settings.url).map_err(|err| {
        CentralPatientRequestError::InternalError(format!(
            "Failed to parse central server url: {}",
            err
        ))
    })?;
    let client = ClientBuilder::new()
        .build()
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{:?}", err)))?;

    let api = PatientApiV4::new(
        client,
        central_server_url.clone(),
        &sync_settings.username,
        &sync_settings.password_sha256,
    );

    let PatientSearch {
        code,
        code_2: _,
        first_name,
        last_name,
        date_of_birth,
        name: _,
        gender: _,
        identifier: _,
    } = params;
    let patients = api
        .patient(PatientParamsV4 {
            limit: None,
            offset: None,
            first_name: first_name.map(|it| format!("@{it}@")),
            last_name: last_name.map(|it| format!("@{it}@")),
            dob: date_of_birth,
            policy_number: None,
            barcode: None,
            is_deleted: Some(false),
            code,
        })
        .await
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{:?}", err)))?;
    Ok(patients)
}

#[derive(Clone, Debug)]
pub struct NameStoreJoin {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
}

/// Creates a name_store_join for the patient
pub async fn link_patient_to_store(
    service_provider: &ServiceProvider,
    context: &ServiceContext,
    store_id: &str,
    name_id: &str,
) -> Result<NameStoreJoin, CentralPatientRequestError> {
    let sync_settings = service_provider.settings.sync_settings(context)?.ok_or(
        CentralPatientRequestError::InternalError("Missing sync settings".to_string()),
    )?;

    let central_server_url = Url::parse(&sync_settings.url).map_err(|err| {
        CentralPatientRequestError::InternalError(format!(
            "Failed to parse central server url: {}",
            err
        ))
    })?;
    let client = ClientBuilder::new()
        .build()
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{:?}", err)))?;

    let api = PatientApiV4::new(
        client,
        central_server_url.clone(),
        &sync_settings.username,
        &sync_settings.password_sha256,
    );

    let NameStoreJoinV2 {
        id,
        name_id,
        store_id,
        inactive: _,
    } = api
        .name_store_join(NameStoreJoinParamsV4 {
            name_id: name_id.to_string(),
            store_id: store_id.to_string(),
        })
        .await
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{:?}", err)))?;

    let result = NameStoreJoin {
        id,
        name_id,
        store_id,
    };

    link_patient_to_store_v6(service_provider, &sync_settings, &result).await?;

    Ok(result)
}

/// Creates a name_store_join for the patient on Open mSupply Central Server
/// v6 records for the patient are also synced to this store
async fn link_patient_to_store_v6(
    service_provider: &ServiceProvider,
    sync_settings: &SyncSettings,
    NameStoreJoin {
        id,
        name_id,
        store_id,
    }: &NameStoreJoin,
) -> Result<(), CentralPatientRequestError> {
    let om_central_url = match CentralServerConfig::get() {
        CentralServerConfig::NotConfigured => {
            return Err(CentralPatientRequestError::InternalError(
                "Open mSupply Central Server not configured".to_string(),
            ))
        }
        // Don't need to push to central if we are central :)
        CentralServerConfig::IsCentralServer => return Ok(()),
        CentralServerConfig::CentralServerUrl(url) => url,
    };

    let client = ClientBuilder::new()
        .build()
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{:?}", err)))?;

    let server_url = Url::parse(&om_central_url).map_err(|_| {
        CentralPatientRequestError::InternalError(format!("Cannot parse central server URL: "))
    })?;

    let om_central_api = OmsCentralApi::new(client, server_url);

    let sync_v5_settings =
        SyncApiV5::new_settings(sync_settings, service_provider, SYNC_V5_VERSION)
            .map_err(|err| CentralPatientRequestError::InternalError(format!("{:?}", err)))?;

    om_central_api
        .name_store_join(NameStoreJoinParams {
            id: id.clone(),
            name_id: name_id.clone(),
            store_id: store_id.clone(),
            sync_v5_settings,
        })
        .await
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{:?}", err)))?;

    Ok(())
}

impl From<RepositoryError> for CentralPatientRequestError {
    fn from(err: RepositoryError) -> Self {
        CentralPatientRequestError::DatabaseError(err)
    }
}
