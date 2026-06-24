use repository::{
    EqualFilter, NameRowRepository, NameRowType, Patient, PatientFilter, PropertyV2Repository,
    RepositoryError, TransactionError,
};

use crate::service_provider::{ServiceContext, ServiceProvider};

/// `property_table_v2.table_name` scope for patient custom properties. Patients
/// share the underlying mSupply name custom fields with suppliers, but their
/// visible set is controlled independently via this scope (see
/// `central_mapping_properties`).
const PATIENT_PROPERTY_TABLE: &str = "patient";

#[derive(PartialEq, Debug)]
pub enum UpdatePatientPropertiesV2Error {
    PatientDoesNotExist,
    NotAPatient,
    /// A patched key is not a visible patient property — reject rather than
    /// writing a key the read path would silently filter out.
    UnknownPropertyKey(String),
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct UpdatePatientPropertiesV2 {
    pub id: String,
    /// Patch of property key -> value to merge into `name.properties_v2`. A JSON
    /// `null` value deletes that key; keys absent from the patch are left as-is.
    pub properties: serde_json::Map<String, serde_json::Value>,
}

/// Merge a key→value patch into an existing `properties_v2` blob.
///
/// A `null` value removes the key; any other value sets it. Returns `None` when
/// the result is empty so an emptied blob becomes NULL rather than `{}`.
fn merge_patch(
    existing: Option<serde_json::Value>,
    patch: serde_json::Map<String, serde_json::Value>,
) -> Option<serde_json::Value> {
    let mut map = match existing {
        Some(serde_json::Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    };

    for (key, value) in patch {
        if value.is_null() {
            map.remove(&key);
        } else {
            map.insert(key, value);
        }
    }

    if map.is_empty() {
        None
    } else {
        Some(serde_json::Value::Object(map))
    }
}

pub(crate) fn update_patient_properties_v2(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    input: UpdatePatientPropertiesV2,
) -> Result<Patient, UpdatePatientPropertiesV2Error> {
    let patient = ctx
        .connection
        .transaction_sync(|con| {
            let name_repo = NameRowRepository::new(con);
            let existing = name_repo
                .find_one_by_id(&input.id)?
                .ok_or(UpdatePatientPropertiesV2Error::PatientDoesNotExist)?;

            if existing.r#type != NameRowType::Patient {
                return Err(UpdatePatientPropertiesV2Error::NotAPatient);
            }

            // Only allow patched keys that are defined and visible for patients.
            let allowed =
                PropertyV2Repository::new(con).allowed_keys_for_table(PATIENT_PROPERTY_TABLE)?;
            if let Some(unknown) = input.properties.keys().find(|key| !allowed.contains(*key)) {
                return Err(UpdatePatientPropertiesV2Error::UnknownPropertyKey(
                    unknown.clone(),
                ));
            }

            // Merge the patch over the existing blob (preserves keys not in the
            // patch — including any legacy-import-owned custom_1/2/3).
            let merged = merge_patch(existing.properties_v2, input.properties);
            name_repo.update_properties_v2(&input.id, &merged)?;

            let patient = service_provider
                .patient_service
                .get_patients(
                    ctx,
                    None,
                    Some(PatientFilter::new().id(EqualFilter::equal_to(input.id.to_string()))),
                    None,
                    None,
                )
                .map_err(UpdatePatientPropertiesV2Error::DatabaseError)?
                .rows
                .pop()
                .ok_or(UpdatePatientPropertiesV2Error::InternalError(
                    "Can't find the updated patient".to_string(),
                ))?;
            Ok(patient)
        })
        .map_err(|err: TransactionError<UpdatePatientPropertiesV2Error>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for UpdatePatientPropertiesV2Error {
    fn from(err: RepositoryError) -> Self {
        UpdatePatientPropertiesV2Error::DatabaseError(err)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        NameRow, NameRowRepository, NameRowType, PropertyKindV2, PropertyTableV2Row,
        PropertyTableV2RowRepository, PropertyV2Row, PropertyV2RowRepository, PropertyValueTypeV2,
    };
    use serde_json::json;
    use util::uuid::uuid;

    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};

    use super::{UpdatePatientPropertiesV2, UpdatePatientPropertiesV2Error};

    // Seed one visible patient property (`custom_1`) so key validation passes.
    fn seed_patient_property(connection: &repository::StorageConnection) {
        PropertyV2RowRepository::new(connection)
            .upsert_one(&PropertyV2Row {
                id: "custom_1".to_string(),
                key: "custom_1".to_string(),
                name: "Custom 1".to_string(),
                value_type: PropertyValueTypeV2::Text,
                kind: PropertyKindV2::Legacy,
                deleted_datetime: None,
            })
            .unwrap();
        PropertyTableV2RowRepository::new(connection)
            .upsert_one(&PropertyTableV2Row {
                id: "custom_1__patient".to_string(),
                property_id: "custom_1".to_string(),
                table_name: "patient".to_string(),
                is_visible: true,
            })
            .unwrap();
    }

    fn insert_patient(connection: &repository::StorageConnection) -> NameRow {
        let row = NameRow {
            id: uuid(),
            r#type: NameRowType::Patient,
            ..Default::default()
        };
        NameRowRepository::new(connection).upsert_one(&row).unwrap();
        row
    }

    #[actix_rt::test]
    async fn update_patient_properties_v2_errors() {
        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_and_service_provider(
            "update_patient_properties_v2_errors",
            repository::mock::MockDataInserts::none(),
        )
        .await;
        seed_patient_property(&connection);

        // PatientDoesNotExist
        assert_eq!(
            service_provider.patient_service.update_patient_properties_v2(
                &service_context,
                &service_provider,
                UpdatePatientPropertiesV2 {
                    id: "does_not_exist".to_string(),
                    properties: serde_json::Map::new(),
                },
            ),
            Err(UpdatePatientPropertiesV2Error::PatientDoesNotExist)
        );

        // NotAPatient (a facility name)
        let facility = NameRow {
            id: uuid(),
            r#type: NameRowType::Facility,
            ..Default::default()
        };
        NameRowRepository::new(&connection)
            .upsert_one(&facility)
            .unwrap();
        assert_eq!(
            service_provider.patient_service.update_patient_properties_v2(
                &service_context,
                &service_provider,
                UpdatePatientPropertiesV2 {
                    id: facility.id.clone(),
                    properties: serde_json::Map::new(),
                },
            ),
            Err(UpdatePatientPropertiesV2Error::NotAPatient)
        );

        // UnknownPropertyKey
        let patient = insert_patient(&connection);
        let mut patch = serde_json::Map::new();
        patch.insert("not_a_property".to_string(), json!("x"));
        assert_eq!(
            service_provider.patient_service.update_patient_properties_v2(
                &service_context,
                &service_provider,
                UpdatePatientPropertiesV2 {
                    id: patient.id.clone(),
                    properties: patch,
                },
            ),
            Err(UpdatePatientPropertiesV2Error::UnknownPropertyKey(
                "not_a_property".to_string()
            ))
        );
    }

    #[actix_rt::test]
    async fn update_patient_properties_v2_merges() {
        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_and_service_provider(
            "update_patient_properties_v2_merges",
            repository::mock::MockDataInserts::none(),
        )
        .await;
        seed_patient_property(&connection);

        let patient = insert_patient(&connection);
        let row_repo = NameRowRepository::new(&connection);

        // Pre-seed an OMS-authored key not in the patch to confirm it survives.
        // (custom_1 is the only visible key; we seed the blob directly to include
        // an extra key as if a prior edit / import had set it.)
        row_repo
            .update_properties_v2(
                &patient.id,
                &Some(json!({ "custom_1": "old", "preexisting": "keep" })),
            )
            .unwrap();

        // Patch custom_1.
        let mut patch = serde_json::Map::new();
        patch.insert("custom_1".to_string(), json!("new"));
        service_provider
            .patient_service
            .update_patient_properties_v2(
                &service_context,
                &service_provider,
                UpdatePatientPropertiesV2 {
                    id: patient.id.clone(),
                    properties: patch,
                },
            )
            .unwrap();

        let stored = row_repo.find_one_by_id(&patient.id).unwrap().unwrap();
        assert_eq!(
            stored.properties_v2,
            Some(json!({ "custom_1": "new", "preexisting": "keep" }))
        );

        // A null value deletes the key.
        let mut patch = serde_json::Map::new();
        patch.insert("custom_1".to_string(), json!(null));
        service_provider
            .patient_service
            .update_patient_properties_v2(
                &service_context,
                &service_provider,
                UpdatePatientPropertiesV2 {
                    id: patient.id.clone(),
                    properties: patch,
                },
            )
            .unwrap();

        let stored = row_repo.find_one_by_id(&patient.id).unwrap().unwrap();
        assert_eq!(stored.properties_v2, Some(json!({ "preexisting": "keep" })));
    }
}
