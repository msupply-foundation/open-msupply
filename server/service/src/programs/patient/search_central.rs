use chrono::NaiveDate;
use log::{error, info};
use repository::{
    DateFilter, KeyType, KeyValueStoreRepository, PatientFilter, RepositoryError, StringFilter,
};
use thiserror::Error;
use url::Url;
use util::format_error;

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
        ActiveStoresOnSite, CentralServerConfig, GetActiveStoresOnSiteError,
        api::SyncApiV5,
        settings::{SYNC_V5_VERSION, SyncSettings},
    },
    sync_v7::{
        api::{SyncApiV7, patient_search},
        patient_lookup::pull_and_integrate_patient_data,
    },
};

use super::PatientSearch;

/// Searching other facilities' patients on the central server.
#[derive(Default)]
pub struct CentralPatientSearch {
    /// Matches the start of the patient code (v7); exactly on legacy mSupply.
    pub code: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    /// An exact date of birth.
    pub date_of_birth: Option<NaiveDate>,
    /// A range of dates of birth, for a year or a month (v7 only).
    pub date_of_birth_from: Option<NaiveDate>,
    pub date_of_birth_to: Option<NaiveDate>,
    /// A page, in name order (v7 only; legacy mSupply returns every match).
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

/// The filter sent to the central server. Built here, on the remote, so the
/// matching is this version's: names and code from the start of the text, as
/// in this site's own search, and a date of birth as a date or a range.
fn central_search_filter(params: &CentralPatientSearch) -> PatientFilter {
    let mut filter = PatientFilter::new();
    // The patient ID matches the start of the code or code 2, as this site's
    // own search does. The central is never older than its remotes, so it
    // reads the filter.
    if let Some(code) = &params.code {
        filter = filter.code_or_code_2(StringFilter::starts_with(code));
    }
    if let Some(first_name) = &params.first_name {
        filter = filter.first_name(StringFilter::starts_with(first_name));
    }
    if let Some(last_name) = &params.last_name {
        filter = filter.last_name(StringFilter::starts_with(last_name));
    }
    let date_of_birth = match (
        params.date_of_birth,
        params.date_of_birth_from,
        params.date_of_birth_to,
    ) {
        (Some(date), _, _) => Some(DateFilter::equal_to(date)),
        (None, Some(from), Some(to)) => Some(DateFilter::date_range(&from, &to)),
        (None, Some(from), None) => Some(DateFilter::after_or_equal_to(from)),
        (None, None, Some(to)) => Some(DateFilter::before_or_equal_to(to)),
        (None, None, None) => None,
    };
    if let Some(date_of_birth) = date_of_birth {
        filter = filter.date_of_birth(date_of_birth);
    }
    filter
}

// TODO: When standalone work done, also check OMS only central.
fn is_v7_remote(ctx: &ServiceContext) -> Result<bool, RepositoryError> {
    let token =
        KeyValueStoreRepository::new(&ctx.connection).get_string(KeyType::SettingsSyncV7Token)?;
    Ok(token.is_some())
}

fn map_v7_sync_error(err: repository::syncv7::SyncError) -> CentralPatientRequestError {
    error!("v7 patient lookup failed: {err}");
    match err {
        repository::syncv7::SyncError::ConnectionError { .. } => {
            CentralPatientRequestError::ConnectionError(format_error(&err))
        }
        _ => CentralPatientRequestError::InternalError(format_error(&err)),
    }
}

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
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    params: CentralPatientSearch,
) -> Result<Vec<PatientV4>, CentralPatientRequestError> {
    let sync_settings = service_provider
        .settings
        .sync_settings(ctx)?
        .ok_or_else(|| {
            CentralPatientRequestError::InternalError("Missing sync settings".to_string())
        })?;

    if is_v7_remote(ctx)? {
        return patient_search_central_v7(service_provider, &sync_settings, params).await;
    }

    // Legacy mSupply takes an exact date of birth only, and no page.
    patient_search_central_v4(
        &sync_settings,
        PatientSearch {
            code: params.code,
            code_2: None,
            first_name: params.first_name,
            last_name: params.last_name,
            name: None,
            date_of_birth: params.date_of_birth,
            gender: None,
            identifier: None,
        },
    )
    .await
}

async fn patient_search_central_v4(
    sync_settings: &SyncSettings,
    params: PatientSearch,
) -> Result<Vec<PatientV4>, CentralPatientRequestError> {
    let central_server_url = Url::parse(&sync_settings.url).map_err(|err| {
        CentralPatientRequestError::InternalError(format!(
            "Failed to parse central server url: {err}"
        ))
    })?;

    let api = PatientApiV4::new(
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
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{err:?}")))?;
    Ok(patients)
}

async fn patient_search_central_v7(
    service_provider: &ServiceProvider,
    sync_settings: &SyncSettings,
    params: CentralPatientSearch,
) -> Result<Vec<PatientV4>, CentralPatientRequestError> {
    let api = SyncApiV7::new(service_provider, &sync_settings.url).map_err(map_v7_sync_error)?;

    api.patient_search(patient_search::Input {
        filter: central_search_filter(&params),
        limit: params.limit,
        offset: params.offset,
    })
    .await
    .map_err(map_v7_sync_error)
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
    if is_v7_remote(context)? {
        return link_patient_to_store_v7(service_provider, store_id, name_id).await;
    }

    let sync_settings = service_provider.settings.sync_settings(context)?.ok_or(
        CentralPatientRequestError::InternalError("Missing sync settings".to_string()),
    )?;

    let central_server_url = Url::parse(&sync_settings.url).map_err(|err| {
        CentralPatientRequestError::InternalError(format!(
            "Failed to parse central server url: {err}"
        ))
    })?;

    let api = PatientApiV4::new(
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
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{err:?}")))?;

    let result = NameStoreJoin {
        id,
        name_id,
        store_id,
    };

    link_patient_to_store_v6(service_provider, &sync_settings, &result).await?;

    Ok(result)
}

async fn link_patient_to_store_v7(
    service_provider: &ServiceProvider,
    store_id: &str,
    name_id: &str,
) -> Result<NameStoreJoin, CentralPatientRequestError> {
    let id = util::uuid::uuid();

    // If nsj exists, then generated id is discarded.
    let nsj_id = pull_and_integrate_patient_data(service_provider, name_id, store_id, &id)
        .await
        .map_err(map_v7_sync_error)?;

    Ok(NameStoreJoin {
        id: nsj_id,
        name_id: name_id.to_string(),
        store_id: store_id.to_string(),
    })
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
            ));
        }
        // Don't need to push to central if we are central :)
        CentralServerConfig::IsCentralServer
        | CentralServerConfig::ForcedCentralServer
        | CentralServerConfig::StandaloneCentral => return Ok(()),
        CentralServerConfig::CentralServerUrl(url) => url,
    };

    let server_url = Url::parse(&om_central_url).map_err(|_| {
        CentralPatientRequestError::InternalError("Cannot parse central server URL: ".to_string())
    })?;

    let om_central_api = OmsCentralApi::new(server_url);

    let sync_v5_settings =
        SyncApiV5::new_settings(sync_settings, service_provider, SYNC_V5_VERSION)
            .map_err(|err| CentralPatientRequestError::InternalError(format!("{err:?}")))?;

    om_central_api
        .name_store_join(NameStoreJoinParams {
            id: id.clone(),
            name_id: name_id.clone(),
            store_id: store_id.clone(),
            sync_v5_settings,
        })
        .await
        .map_err(|err| CentralPatientRequestError::ConnectionError(format!("{err:?}")))?;

    Ok(())
}

impl From<RepositoryError> for CentralPatientRequestError {
    fn from(err: RepositoryError) -> Self {
        CentralPatientRequestError::DatabaseError(err)
    }
}

#[derive(Error, Debug)]
pub enum AddPatientToCentralError {
    #[error("Not running as central server")]
    NotACentralServer,
    #[error(transparent)]
    CentralPatientRequestError(CentralPatientRequestError),
    #[error(transparent)]
    ActiveStoresOnSiteError(GetActiveStoresOnSiteError),
    #[error("No active store found for this site")]
    NoActiveStore,
}

pub async fn add_patient_to_oms_central(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    name_id: &str,
) -> Result<(), AddPatientToCentralError> {
    if !CentralServerConfig::is_central_server() {
        return Err(AddPatientToCentralError::NotACentralServer);
    }

    let central_stores = ActiveStoresOnSite::get(&ctx.connection).map_err(|err| {
        error!("Failed to get active stores on site: {err}");
        AddPatientToCentralError::ActiveStoresOnSiteError(err)
    })?;

    let central_store_id = central_stores
        .store_ids()
        .first()
        .ok_or_else(|| {
            error!("No active stores found for this site");
            AddPatientToCentralError::NoActiveStore
        })?
        .to_owned();

    // Add visibility for this patient to central site
    link_patient_to_store(service_provider, ctx, &central_store_id, name_id)
        .await
        .map_err(AddPatientToCentralError::CentralPatientRequestError)?;

    info!("Created name_store_join for patient {name_id} and central store {central_store_id}");

    // TODO: possibly should check is not pre-initialisation here?
    service_provider.sync_trigger.trigger();
    info!("Sync cycle triggered to receive patient records");

    Ok(())
}
