use chrono::Utc;
use repository::{
    ActivityLogType, NameRow, NameRowRepository, NameRowType, Patient, RepositoryError,
    TransactionError, unnamed_patient_id,
};

use crate::{
    activity_log::activity_log_entry_with_diff,
    preference::{Preference, UseUnnamedPatient},
    service_provider::ServiceContext,
};

use super::patient_updated::activate_patient_name_store_join;

/// The stored name and code of every store's unnamed patient. Screens show
/// their own translated label rather than this name.
pub const UNNAMED_PATIENT_NAME: &str = "Unnamed patient";
pub const UNNAMED_PATIENT_CODE: &str = "UNNAMED";

#[derive(PartialEq, Debug)]
pub enum GetOrCreateUnnamedPatientError {
    /// The store's "Use the unnamed patient" preference is off
    NotUsedByStore,
    PreferenceError(String),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for GetOrCreateUnnamedPatientError {
    fn from(error: RepositoryError) -> Self {
        GetOrCreateUnnamedPatientError::DatabaseError(error)
    }
}

/// The store's unnamed patient, the one patient record its walk-in visits are
/// dispensed to (spec/prescriptions rules › the unnamed patient,
/// kdd/unnamed-patient). Created on the first call, with the store's
/// name_store_join; every later call, on any site, returns the same record,
/// since its id comes from the store's.
pub fn get_or_create_unnamed_patient(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Patient, GetOrCreateUnnamedPatientError> {
    let used = UseUnnamedPatient
        .load(&ctx.connection, Some(store_id.to_string()))
        .map_err(|e| GetOrCreateUnnamedPatientError::PreferenceError(format!("{e:?}")))?;
    if !used {
        return Err(GetOrCreateUnnamedPatientError::NotUsedByStore);
    }

    let id = unnamed_patient_id(store_id);
    ctx.connection
        .transaction_sync(|con| {
            let repo = NameRowRepository::new(con);
            let patient = match repo.find_one_by_id(&id)? {
                // A deleted one comes back rather than being created again:
                // the id is fixed, so there can only be one
                Some(existing) if existing.deleted_datetime.is_some() => {
                    let restored = NameRow {
                        deleted_datetime: None,
                        ..existing
                    };
                    repo.upsert_one(&restored)?;
                    restored
                }
                Some(existing) => existing,
                None => {
                    let row = NameRow {
                        id: id.clone(),
                        name: UNNAMED_PATIENT_NAME.to_string(),
                        code: UNNAMED_PATIENT_CODE.to_string(),
                        r#type: NameRowType::Patient,
                        is_customer: true,
                        is_supplier: false,
                        supplying_store_id: Some(store_id.to_string()),
                        created_datetime: Some(Utc::now().naive_utc()),
                        ..Default::default()
                    };
                    repo.upsert_one(&row)?;
                    activity_log_entry_with_diff(
                        ctx,
                        ActivityLogType::PatientCreated,
                        Some(id.clone()),
                        None::<&NameRow>,
                        &row,
                    )?;
                    row
                }
            };
            // Visible in its store, as a patient created there is
            activate_patient_name_store_join(con, store_id, &id, None)?;
            Ok(patient)
        })
        .map_err(|error: TransactionError<RepositoryError>| error.to_inner_error().into())
}

#[cfg(test)]
mod test {
    use repository::{
        EqualFilter, NameStoreJoinFilter, NameStoreJoinRepository, PatientFilter,
        PatientRepository, PreferenceRow, PreferenceRowRepository, StringFilter,
        mock::{MockDataInserts, mock_store_a, mock_store_b},
        test_db::setup_all,
        unnamed_patient_id,
    };

    use super::*;
    use crate::{
        preference::PrefKey,
        programs::patient::{PatientSearch, patient_search_to_filter},
        service_provider::ServiceProvider,
    };

    fn use_unnamed_patient(con: &repository::StorageConnection, store_id: &str, on: bool) {
        PreferenceRowRepository::new(con)
            .upsert_one(&PreferenceRow {
                id: format!("use_unnamed_patient_{store_id}"),
                key: PrefKey::UseUnnamedPatient.to_string(),
                value: on.to_string(),
                store_id: Some(store_id.to_string()),
            })
            .unwrap();
    }

    // OMS-REG-DIS-12.185, .187, .192
    #[actix_rt::test]
    async fn unnamed_patient_is_created_once_per_store_and_only_where_used() {
        let (_, connection, connection_manager, _) = setup_all(
            "get_or_create_unnamed_patient",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let store_a = mock_store_a().id;

        // Off by default: refused, and nothing is created
        assert_eq!(
            get_or_create_unnamed_patient(&ctx, &store_a),
            Err(GetOrCreateUnnamedPatientError::NotUsedByStore)
        );
        assert_eq!(
            NameRowRepository::new(&connection)
                .find_one_by_id(&unnamed_patient_id(&store_a))
                .unwrap(),
            None
        );

        use_unnamed_patient(&connection, &store_a, true);
        let first = get_or_create_unnamed_patient(&ctx, &store_a).unwrap();
        assert_eq!(first.id, unnamed_patient_id(&store_a));
        assert_eq!(first.name, UNNAMED_PATIENT_NAME);
        assert_eq!(first.r#type, NameRowType::Patient);

        // The same record every time, with one join to its store
        let second = get_or_create_unnamed_patient(&ctx, &store_a).unwrap();
        assert_eq!(second.id, first.id);
        let joins = NameStoreJoinRepository::new(&connection)
            .query_by_filter(
                NameStoreJoinFilter::new()
                    .name_id(EqualFilter::equal_to(first.id.clone()))
                    .store_id(EqualFilter::equal_to(store_a.clone())),
            )
            .unwrap();
        assert_eq!(joins.len(), 1);
        assert!(joins[0].name_store_join.visible);

        // Another store gets its own
        let store_b = mock_store_b().id;
        use_unnamed_patient(&connection, &store_b, true);
        let other = get_or_create_unnamed_patient(&ctx, &store_b).unwrap();
        assert_eq!(other.id, unnamed_patient_id(&store_b));

        // Found by id, never by search (OMS-REG-DIS-12.190)
        assert_eq!(
            PatientRepository::new(&connection)
                .query_by_filter(
                    PatientFilter::new().id(EqualFilter::equal_to(first.id.clone())),
                    None
                )
                .unwrap()
                .len(),
            1
        );
        let found = PatientRepository::new(&connection)
            .query_by_filter(
                patient_search_to_filter(PatientSearch {
                    code: None,
                    code_2: None,
                    name: None,
                    first_name: None,
                    last_name: None,
                    date_of_birth: None,
                    gender: None,
                    identifier: Some("Unnamed".to_string()),
                }),
                None,
            )
            .unwrap();
        assert!(found.is_empty(), "search found {found:?}");
        let by_code = PatientRepository::new(&connection)
            .query_by_filter(
                PatientFilter::new()
                    .code(StringFilter::equal_to(UNNAMED_PATIENT_CODE))
                    .exclude_unnamed(),
                None,
            )
            .unwrap();
        assert!(by_code.is_empty());
    }
}
