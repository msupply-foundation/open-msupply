use repository::RepositoryError;
use reqwest::ClientBuilder;
use url::Url;

use crate::{
    apis::patient_v4::{
        NameStoreJoinParamsV4, NameStoreJoinV2, PatientApiV4, PatientParamsV4, PatientV4,
    },
    service_provider::{ServiceContext, ServiceProvider},
    sync::settings::SyncSettings,
};

use super::PatientSearch;

#[derive(Debug)]
pub enum CentralPatientRequestError {
    DatabaseError(RepositoryError),
    InternalError(String),
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
        gender: _,
        name_or_code: _,
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
    context: ServiceContext,
    store_id: &str,
    name_id: &str,
) -> Result<NameStoreJoin, CentralPatientRequestError> {
    let sync_settings = service_provider.settings.sync_settings(&context)?.ok_or(
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
    Ok(NameStoreJoin {
        id,
        name_id,
        store_id,
    })
}

impl From<RepositoryError> for CentralPatientRequestError {
    fn from(err: RepositoryError) -> Self {
        CentralPatientRequestError::DatabaseError(err)
    }
}
