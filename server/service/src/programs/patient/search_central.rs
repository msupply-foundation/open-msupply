use chrono::NaiveDate;
use log::{error, info};
use repository::{
    DateFilter, KeyType, KeyValueStoreRepository, PatientFilter, RepositoryError, StringFilter,
    has_search_words, is_unnamed_patient_id,
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
        api::{InteractiveError, SyncApiV7, patient_search},
        patient_lookup::pull_and_integrate_patient_data,
    },
    validate::check_patient_exists,
};

use super::{PatientSearch, patient_updated::activate_patient_name_store_join};

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

/// Whether legacy mSupply has anything to filter on: it ignores a date of
/// birth range. `@` is legacy mSupply's wildcard, so a name of only symbols
/// (which finds no one locally) or a patient ID holding `@` (which matches
/// itself locally) isn't sent: "@" alone would return every patient
/// (OMS-REG-DIS-01.88).
fn legacy_can_filter(params: &CentralPatientSearch) -> bool {
    let finds_no_one = |name: &Option<String>| {
        name.as_deref()
            .is_some_and(|name| !name.trim().is_empty() && !has_search_words(name))
    };
    if finds_no_one(&params.first_name)
        || finds_no_one(&params.last_name)
        || params
            .code
            .as_deref()
            .is_some_and(|code| code.contains('@'))
    {
        return false;
    }
    params.code.is_some()
        || params.first_name.is_some()
        || params.last_name.is_some()
        || params.date_of_birth.is_some()
}

// TODO: When standalone work done, also check OMS only central.
fn is_v7_remote(ctx: &ServiceContext) -> Result<bool, RepositoryError> {
    let token =
        KeyValueStoreRepository::new(&ctx.connection).get_string(KeyType::SettingsSyncV7Token)?;
    Ok(token.is_some())
}

fn map_interactive_error(err: InteractiveError) -> CentralPatientRequestError {
    match err {
        InteractiveError::Sync(err) => map_v7_sync_error(err),
        InteractiveError::NoAnswer { .. } => {
            error!("v7 patient search: {err}");
            CentralPatientRequestError::NoAnswer(format_error(&err))
        }
    }
}

fn map_v7_sync_error(err: repository::syncv7::SyncError) -> CentralPatientRequestError {
    error!("v7 patient lookup failed: {err}");
    match err {
        repository::syncv7::SyncError::ConnectionError { .. } => {
            CentralPatientRequestError::ConnectionError(format_error(&err))
        }
        // Central is there but turning searches away for now: its sync is
        // paused, or it's integrating a push from this site
        repository::syncv7::SyncError::SyncApiPaused
        | repository::syncv7::SyncError::SiteLockError(_) => {
            CentralPatientRequestError::NoAnswer(format_error(&err))
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
    /// Reached central, but it didn't answer in time, or is refusing
    /// searches for now (sync paused, or integrating a push from this site)
    #[error("No answer: {0}")]
    NoAnswer(String),
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

    // Legacy mSupply takes an exact date of birth only, and no page. With
    // nothing else to go on (a year or month of birth alone), it would return
    // every patient, so ask it nothing.
    if !legacy_can_filter(&params) {
        return Ok(Vec::new());
    }
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
    // The legacy central server can't be asked to leave out a store's unnamed
    // patient, so drop it here (spec/prescriptions rules › the unnamed patient)
    Ok(without_unnamed_patients(patients))
}

fn without_unnamed_patients(patients: Vec<PatientV4>) -> Vec<PatientV4> {
    patients
        .into_iter()
        .filter(|patient| !is_unnamed_patient_id(&patient.id))
        .collect()
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
    .map_err(map_interactive_error)
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
    // A store's unnamed patient is never linked to another store
    // (spec/prescriptions rules › the unnamed patient). Search never offers
    // it, so this only guards a call made by hand.
    if is_unnamed_patient_id(name_id) {
        return Err(CentralPatientRequestError::InternalError(
            "The unnamed patient can't be linked to a store".to_string(),
        ));
    }

    // A patient of another store already on this server (any patient on the
    // central server, or one of this site's own on a remote) has their records
    // here: add them to the store directly, as central does when a remote asks
    // for one. The join syncs on like any other, and central needn't be
    // reachable.
    if check_patient_exists(&context.connection, name_id)?.is_some() {
        let id = context
            .connection
            .transaction_sync(|connection| {
                activate_patient_name_store_join(connection, store_id, name_id, None)
            })
            .map_err(|error| error.to_inner_error())?;
        return Ok(NameStoreJoin {
            id,
            name_id: name_id.to_string(),
            store_id: store_id.to_string(),
        });
    }

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

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use repository::{DateFilter, PatientFilter, StringFilter};

    use repository::syncv7::{SiteLockError, SyncError};

    use super::{
        CentralPatientRequestError, CentralPatientSearch, central_search_filter, legacy_can_filter,
        link_patient_to_store, map_v7_sync_error, without_unnamed_patients,
    };
    use crate::{apis::patient_v4::PatientV4, test_helpers::setup_all_and_service_provider};
    use repository::{mock::MockDataInserts, unnamed_patient_id};

    fn legacy_patient(id: &str, code: &str) -> PatientV4 {
        PatientV4 {
            id: id.to_string(),
            name: code.to_string(),
            phone: String::new(),
            email: String::new(),
            code: code.to_string(),
            last: String::new(),
            first: String::new(),
            date_of_birth: None,
            gender: None,
            code_2: None,
            is_deceased: false,
            address1: None,
            next_of_kin_name: None,
        }
    }

    // OMS-REG-DIS-12.208: legacy mSupply can't be asked to leave it out, so
    // the site drops every store's unnamed patient from its results
    #[test]
    fn legacy_results_leave_out_every_stores_unnamed_patient() {
        let ids: Vec<String> = without_unnamed_patients(vec![
            legacy_patient(&unnamed_patient_id("store_a"), "UNNAMED"),
            legacy_patient("unnamed_patients_list", "LOOKALIKE"),
            legacy_patient(&unnamed_patient_id("store_b"), "UNNAMED"),
            legacy_patient("registered", "REG-1"),
        ])
        .into_iter()
        .map(|patient| patient.id)
        .collect();
        // Only the fixed id counts, not a name that starts the same way
        assert_eq!(ids, ["unnamed_patients_list", "registered"]);
    }

    // OMS-REG-DIS-12.211: the site refuses before it asks central, so a
    // site without sync settings still refuses
    #[actix_rt::test]
    async fn linking_the_unnamed_patient_is_refused_on_the_site() {
        let context =
            setup_all_and_service_provider("link_unnamed_patient_refused", MockDataInserts::none())
                .await;
        let result = link_patient_to_store(
            &context.service_provider,
            &context.service_context,
            "store_b",
            &unnamed_patient_id("store_a"),
        )
        .await;
        assert!(
            matches!(result, Err(CentralPatientRequestError::InternalError(ref message)) if message.contains("unnamed patient")),
            "{result:?}"
        );
    }

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    #[test]
    fn central_filter_matches_names_and_either_code_from_the_start() {
        let filter = central_search_filter(&CentralPatientSearch {
            code: Some("AB1".to_string()),
            first_name: Some("Awa".to_string()),
            last_name: Some("Diallo".to_string()),
            ..Default::default()
        });
        assert_eq!(
            filter,
            PatientFilter::new()
                .code_or_code_2(StringFilter::starts_with("AB1"))
                .first_name(StringFilter::starts_with("Awa"))
                .last_name(StringFilter::starts_with("Diallo"))
        );
    }

    #[test]
    fn central_filter_takes_a_date_of_birth_as_a_day_or_a_range() {
        let born = |from: Option<NaiveDate>, to: Option<NaiveDate>, day: Option<NaiveDate>| {
            central_search_filter(&CentralPatientSearch {
                date_of_birth: day,
                date_of_birth_from: from,
                date_of_birth_to: to,
                ..Default::default()
            })
            .date_of_birth
        };
        let (jan, dec) = (date(1984, 1, 1), date(1984, 12, 31));

        assert_eq!(born(None, None, Some(jan)), Some(DateFilter::equal_to(jan)));
        // A day wins over a range
        assert_eq!(
            born(Some(jan), Some(dec), Some(jan)),
            Some(DateFilter::equal_to(jan))
        );
        assert_eq!(
            born(Some(jan), Some(dec), None),
            Some(DateFilter::date_range(&jan, &dec))
        );
        assert_eq!(
            born(Some(jan), None, None),
            Some(DateFilter::after_or_equal_to(jan))
        );
        assert_eq!(
            born(None, Some(dec), None),
            Some(DateFilter::before_or_equal_to(dec))
        );
        assert_eq!(born(None, None, None), None);
    }

    // A year or month of birth alone would ask legacy mSupply for every patient
    #[test]
    fn legacy_is_not_asked_with_only_a_date_of_birth_range() {
        assert!(!legacy_can_filter(&CentralPatientSearch {
            date_of_birth_from: Some(date(1984, 1, 1)),
            date_of_birth_to: Some(date(1984, 12, 31)),
            limit: Some(51),
            ..Default::default()
        }));
        assert!(legacy_can_filter(&CentralPatientSearch {
            last_name: Some("Diallo".to_string()),
            ..Default::default()
        }));
        assert!(legacy_can_filter(&CentralPatientSearch {
            date_of_birth: Some(date(1984, 3, 14)),
            ..Default::default()
        }));
    }

    // OMS-REG-DIS-01.88: a name of only symbols, or a patient ID holding `@`,
    // isn't sent to legacy mSupply, where `@` alone would match every patient
    #[test]
    fn legacy_is_not_asked_with_its_wildcard() {
        for name in ["@", "%", " - ", "_"] {
            assert!(!legacy_can_filter(&CentralPatientSearch {
                last_name: Some(name.to_string()),
                ..Default::default()
            }));
            assert!(!legacy_can_filter(&CentralPatientSearch {
                first_name: Some(name.to_string()),
                code: Some("ABC".to_string()),
                ..Default::default()
            }));
        }
        for code in ["@", "AB@"] {
            assert!(!legacy_can_filter(&CentralPatientSearch {
                code: Some(code.to_string()),
                last_name: Some("Diallo".to_string()),
                ..Default::default()
            }));
        }
        assert!(legacy_can_filter(&CentralPatientSearch {
            last_name: Some("N'Guessan".to_string()),
            ..Default::default()
        }));
        assert!(legacy_can_filter(&CentralPatientSearch {
            code: Some("AB-1".to_string()),
            ..Default::default()
        }));
    }

    // OMS-REG-DIS-01.84: on central, choosing another store's patient adds
    // them to this store there and then, without asking legacy mSupply
    #[actix_rt::test]
    async fn central_links_a_patient_it_holds_to_the_store_locally() {
        links_a_patient_already_here_locally(
            "central_links_a_patient_it_holds_to_the_store_locally",
            true,
        )
        .await;
    }

    // OMS-REG-DIS-01.85: on a remote site, choosing this site's own patient
    // at another store needs no central server
    #[actix_rt::test]
    async fn remote_links_its_own_patient_to_the_store_locally() {
        links_a_patient_already_here_locally(
            "remote_links_its_own_patient_to_the_store_locally",
            false,
        )
        .await;
    }

    async fn links_a_patient_already_here_locally(db_name: &str, is_central: bool) {
        use repository::{
            EqualFilter, NameRow, NameRowRepository, NameRowType, NameStoreJoinFilter,
            NameStoreJoinRepository, NameStoreJoinRow, PatientRepository,
            mock::{MockDataInserts, mock_store_a},
            test_db::setup_all,
        };

        use super::link_patient_to_store;
        use crate::{service_provider::ServiceProvider, sync::test_util_set_is_central_server};

        let (_, connection, connection_manager, _) =
            setup_all(db_name, MockDataInserts::none().names().stores()).await;
        for id in ["new_here", "hidden_here"] {
            NameRowRepository::new(&connection)
                .upsert_one(&NameRow {
                    id: id.to_string(),
                    name: id.to_string(),
                    r#type: NameRowType::Patient,
                    ..Default::default()
                })
                .unwrap();
        }
        let store_id = mock_store_a().id;
        NameStoreJoinRepository::new(&connection)
            .upsert_one(&NameStoreJoinRow {
                id: "hidden_join".to_string(),
                name_id: "hidden_here".to_string(),
                store_id: store_id.clone(),
                visible: false,
                ..Default::default()
            })
            .unwrap();

        test_util_set_is_central_server(is_central);
        // No sync settings, so asking another server would fail
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        let added = link_patient_to_store(&service_provider, &ctx, &store_id, "new_here")
            .await
            .unwrap();
        assert_eq!(added.name_id, "new_here");
        // A hidden join is shown again, not duplicated
        let shown = link_patient_to_store(&service_provider, &ctx, &store_id, "hidden_here")
            .await
            .unwrap();
        assert_eq!(shown.id, "hidden_join");
        let joins = NameStoreJoinRepository::new(&connection)
            .query_by_filter(
                NameStoreJoinFilter::new()
                    .name_id(EqualFilter::equal_to("hidden_here".to_string())),
            )
            .unwrap();
        assert_eq!(joins.len(), 1);

        let mut visible_here: Vec<String> = PatientRepository::new(&connection)
            .query_by_filter(PatientFilter::new().visible_in_store(&store_id, true), None)
            .unwrap()
            .into_iter()
            .map(|patient| patient.id)
            .collect();
        visible_here.sort();
        assert_eq!(visible_here, ["hidden_here", "new_here"]);
    }

    // Central turning a search away for now reads as no answer, so the user
    // sees the "couldn't reach other facilities" warning, not an error
    #[test]
    fn central_refusing_for_now_is_no_answer() {
        assert!(matches!(
            map_v7_sync_error(SyncError::SyncApiPaused),
            CentralPatientRequestError::NoAnswer(_)
        ));
        assert!(matches!(
            map_v7_sync_error(SyncError::SiteLockError(
                SiteLockError::IntegrationInProgress
            )),
            CentralPatientRequestError::NoAnswer(_)
        ));
        assert!(matches!(
            map_v7_sync_error(SyncError::ConnectionError {
                url: "https://central".to_string(),
                e: "refused".to_string()
            }),
            CentralPatientRequestError::ConnectionError(_)
        ));
        assert!(matches!(
            map_v7_sync_error(SyncError::Authentication),
            CentralPatientRequestError::InternalError(_)
        ));
    }
}
