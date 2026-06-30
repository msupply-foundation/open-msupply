use repository::{
    EqualFilter, NameRowRepository, NameRowType, Patient, PatientFilter, RepositoryError,
    TransactionError,
};

use crate::custom_field::{check_unknown_custom_field_key, merge_patch};
use crate::service_provider::{ServiceContext, ServiceProvider};

/// `custom_field_scope.table_name` scope for patient custom custom_fields. Patients
/// share the underlying mSupply name custom fields with suppliers, but their
/// visible set is controlled independently via this scope (see
/// `central_mapping_custom_fields`).
const PATIENT_PROPERTY_TABLE: &str = "patient";

#[derive(PartialEq, Debug)]
pub enum UpdatePatientCustomFieldsError {
    PatientDoesNotExist,
    NotAPatient,
    /// A patched key is not a visible patient custom_field — reject rather than
    /// writing a key the read path would silently filter out.
    UnknownCustomFieldKey(String),
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct UpdatePatientCustomFields {
    pub id: String,
    /// Patch of custom_field key -> value to merge into `name.custom_fields`. A JSON
    /// `null` value deletes that key; keys absent from the patch are left as-is.
    pub custom_fields: serde_json::Map<String, serde_json::Value>,
}

pub(crate) fn update_patient_custom_fields(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    input: UpdatePatientCustomFields,
) -> Result<Patient, UpdatePatientCustomFieldsError> {
    let patient = ctx
        .connection
        .transaction_sync(|con| {
            let name_repo = NameRowRepository::new(con);
            let existing = name_repo
                .find_one_by_id(&input.id)?
                .ok_or(UpdatePatientCustomFieldsError::PatientDoesNotExist)?;

            if existing.r#type != NameRowType::Patient {
                return Err(UpdatePatientCustomFieldsError::NotAPatient);
            }

            // Only allow patched keys that are defined and visible for patients.
            if let Some(unknown) =
                check_unknown_custom_field_key(con, PATIENT_PROPERTY_TABLE, &input.custom_fields)?
            {
                return Err(UpdatePatientCustomFieldsError::UnknownCustomFieldKey(unknown));
            }

            // Merge the patch over the existing blob (preserves keys not in the
            // patch — including any legacy-import-owned custom_1/2/3).
            let merged = merge_patch(existing.custom_fields, input.custom_fields);
            name_repo.update_custom_fields(&input.id, &merged)?;

            let patient = service_provider
                .patient_service
                .get_patients(
                    ctx,
                    None,
                    Some(PatientFilter::new().id(EqualFilter::equal_to(input.id.to_string()))),
                    None,
                    None,
                )
                .map_err(UpdatePatientCustomFieldsError::DatabaseError)?
                .rows
                .pop()
                .ok_or(UpdatePatientCustomFieldsError::InternalError(
                    "Can't find the updated patient".to_string(),
                ))?;
            Ok(patient)
        })
        .map_err(|err: TransactionError<UpdatePatientCustomFieldsError>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for UpdatePatientCustomFieldsError {
    fn from(err: RepositoryError) -> Self {
        UpdatePatientCustomFieldsError::DatabaseError(err)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        NameRow, NameRowRepository, NameRowType, CustomFieldDisplayMode, CustomFieldKind,
        CustomFieldScopeRow, CustomFieldScopeRowRepository, CustomFieldRow, CustomFieldRowRepository,
        CustomFieldValueType,
    };
    use serde_json::json;
    use util::uuid::uuid;

    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};

    use super::{UpdatePatientCustomFields, UpdatePatientCustomFieldsError};

    // Seed one visible patient custom_field (`custom_1`) so key validation passes.
    fn seed_patient_custom_field(connection: &repository::StorageConnection) {
        CustomFieldRowRepository::new(connection)
            .upsert_one(&CustomFieldRow {
                id: "custom_1".to_string(),
                key: "custom_1".to_string(),
                name: "Custom 1".to_string(),
                value_type: CustomFieldValueType::Text,
                kind: CustomFieldKind::Legacy,
                deleted_datetime: None,
            })
            .unwrap();
        CustomFieldScopeRowRepository::new(connection)
            .upsert_one(&CustomFieldScopeRow {
                id: "custom_1__patient".to_string(),
                custom_field_id: "custom_1".to_string(),
                scope: "patient".to_string(),
                display_mode: CustomFieldDisplayMode::Visible,
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
    async fn update_patient_custom_fields_errors() {
        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_and_service_provider(
            "update_patient_custom_fields_errors",
            repository::mock::MockDataInserts::none(),
        )
        .await;
        seed_patient_custom_field(&connection);

        // PatientDoesNotExist
        assert_eq!(
            service_provider
                .patient_service
                .update_patient_custom_fields(
                    &service_context,
                    &service_provider,
                    UpdatePatientCustomFields {
                        id: "does_not_exist".to_string(),
                        custom_fields: serde_json::Map::new(),
                    },
                ),
            Err(UpdatePatientCustomFieldsError::PatientDoesNotExist)
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
            service_provider
                .patient_service
                .update_patient_custom_fields(
                    &service_context,
                    &service_provider,
                    UpdatePatientCustomFields {
                        id: facility.id.clone(),
                        custom_fields: serde_json::Map::new(),
                    },
                ),
            Err(UpdatePatientCustomFieldsError::NotAPatient)
        );

        // UnknownCustomFieldKey
        let patient = insert_patient(&connection);
        let mut patch = serde_json::Map::new();
        patch.insert("not_a_custom_field".to_string(), json!("x"));
        assert_eq!(
            service_provider
                .patient_service
                .update_patient_custom_fields(
                    &service_context,
                    &service_provider,
                    UpdatePatientCustomFields {
                        id: patient.id.clone(),
                        custom_fields: patch,
                    },
                ),
            Err(UpdatePatientCustomFieldsError::UnknownCustomFieldKey(
                "not_a_custom_field".to_string()
            ))
        );
    }

    #[actix_rt::test]
    async fn update_patient_custom_fields_merges() {
        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_and_service_provider(
            "update_patient_custom_fields_merges",
            repository::mock::MockDataInserts::none(),
        )
        .await;
        seed_patient_custom_field(&connection);

        let patient = insert_patient(&connection);
        let row_repo = NameRowRepository::new(&connection);

        // Pre-seed an OMS-authored key not in the patch to confirm it survives.
        // (custom_1 is the only visible key; we seed the blob directly to include
        // an extra key as if a prior edit / import had set it.)
        row_repo
            .update_custom_fields(
                &patient.id,
                &Some(json!({ "custom_1": "old", "preexisting": "keep" })),
            )
            .unwrap();

        // Patch custom_1.
        let mut patch = serde_json::Map::new();
        patch.insert("custom_1".to_string(), json!("new"));
        service_provider
            .patient_service
            .update_patient_custom_fields(
                &service_context,
                &service_provider,
                UpdatePatientCustomFields {
                    id: patient.id.clone(),
                    custom_fields: patch,
                },
            )
            .unwrap();

        let stored = row_repo.find_one_by_id(&patient.id).unwrap().unwrap();
        assert_eq!(
            stored.custom_fields,
            Some(json!({ "custom_1": "new", "preexisting": "keep" }))
        );

        // A null value deletes the key.
        let mut patch = serde_json::Map::new();
        patch.insert("custom_1".to_string(), json!(null));
        service_provider
            .patient_service
            .update_patient_custom_fields(
                &service_context,
                &service_provider,
                UpdatePatientCustomFields {
                    id: patient.id.clone(),
                    custom_fields: patch,
                },
            )
            .unwrap();

        let stored = row_repo.find_one_by_id(&patient.id).unwrap().unwrap();
        assert_eq!(stored.custom_fields, Some(json!({ "preexisting": "keep" })));
    }
}
