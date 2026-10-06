use chrono::{DateTime, NaiveDate, Utc};
use repository::{
    EqualFilter, GenderType, NameRow, NameRowRepository, NameRowType, NameStoreJoinFilter,
    NameStoreJoinRepository, NameStoreJoinRow, Patient, RepositoryError, StorageConnection,
};
use std::str::FromStr;
use util::uuid::uuid;

use super::{
    patient_schema::{ContactDetails, SchemaGender, SchemaPatient},
    UpdateProgramPatientError,
};

// create name_store_join if not existing
pub fn create_patient_name_store_join(
    con: &StorageConnection,
    store_id: &str,
    name_id: &str,
    name_store_join_id: Option<String>,
) -> Result<String, RepositoryError> {
    let existing = NameStoreJoinRepository::new(con)
        .query_by_filter(
            NameStoreJoinFilter::new()
                .store_id(EqualFilter::equal_to(store_id.to_string()))
                .name_id(EqualFilter::equal_to(name_id.to_string())),
        )?
        .pop();
    if let Some(existing) = existing {
        return Ok(existing.name_store_join.id);
    }

    let id = name_store_join_id.unwrap_or_else(uuid);
    NameStoreJoinRepository::new(con).upsert_one(&NameStoreJoinRow {
        id: id.clone(),
        name_id: name_id.to_string(),
        store_id: store_id.to_string(),
        name_is_customer: true,
        name_is_supplier: false,
    })?;
    Ok(id)
}

/// Callback called when a patient document has been updated
/// Updates the names table for the updated patient.
pub fn update_patient_row(
    con: &StorageConnection,
    store_id: Option<String>,
    update_timestamp: &DateTime<Utc>,
    patient: SchemaPatient,
) -> Result<(), UpdateProgramPatientError> {
    let name_repo = NameRowRepository::new(con);
    let existing_name = name_repo.find_one_by_id(&patient.id)?;

    let name_upsert = patient_to_name_row(store_id, update_timestamp, patient, existing_name)?;
    name_repo.upsert_one(&name_upsert)?;

    Ok(())
}

pub(crate) fn patient_to_name_row(
    store_id: Option<String>,
    update_timestamp: &DateTime<Utc>,
    patient: SchemaPatient,
    existing_name: Option<NameRow>,
) -> Result<NameRow, UpdateProgramPatientError> {
    let SchemaPatient {
        id,
        code,
        code_2,
        contact_details,
        date_of_birth,
        first_name,
        last_name,
        gender,
        next_of_kin,
        middle_name: _,
        date_of_birth_is_estimated: _,
        date_of_death,
        is_deceased: _,
        notes: _,
        passport_number: _,
        socio_economics: _,
        allergies: _,
        birth_place: _,
        marital_status: _,
        contacts: _,
        extension: _,
    } = patient;
    let contact = contact_details.as_ref().and_then(|it| it.first());
    let date_of_birth = match date_of_birth {
        Some(date_of_birth) => Some(NaiveDate::from_str(&date_of_birth).map_err(|err| {
            UpdateProgramPatientError::InternalError(format!("Invalid date of birth format: {err}"))
        })?),
        None => None,
    };
    let date_of_death = match date_of_death {
        Some(date_of_death) => Some(NaiveDate::from_str(&date_of_death).map_err(|err| {
            UpdateProgramPatientError::InternalError(format!("Invalid date of death format: {err}"))
        })?),
        None => None,
    };

    let existing_name = existing_name.as_ref();
    Ok(NameRow {
        id: id.clone(),
        name: patient_name(&first_name, &last_name),
        code: code.unwrap_or("".to_string()),
        r#type: NameRowType::Patient,
        is_customer: existing_name.map(|n| n.is_customer).unwrap_or(true),
        is_supplier: existing_name.map(|n| n.is_supplier).unwrap_or(false),
        // supplying_store_id is the home store for a patient and is needed for mSupply compatibility
        supplying_store_id: existing_name
            .and_then(|n| n.supplying_store_id.clone())
            .or(store_id),
        first_name,
        last_name,
        gender: gender.map(|g| match g {
            SchemaGender::Female => GenderType::Female,
            SchemaGender::Male => GenderType::Male,
            SchemaGender::Transgender => GenderType::Transgender,
            SchemaGender::TransgenderMale => GenderType::TransgenderMale,
            SchemaGender::TransgenderMaleHormone => GenderType::TransgenderMaleHormone,
            SchemaGender::TransgenderMaleSurgical => GenderType::TransgenderMaleSurgical,
            SchemaGender::TransgenderFemale => GenderType::TransgenderFemale,
            SchemaGender::TransgenderFemaleHormone => GenderType::TransgenderFemaleHormone,
            SchemaGender::TransgenderFemaleSurgical => GenderType::TransgenderFemaleSurgical,
            SchemaGender::Unknown => GenderType::Unknown,
            SchemaGender::NonBinary => GenderType::NonBinary,
        }),
        date_of_birth,
        charge_code: existing_name.and_then(|n| n.charge_code.clone()),
        comment: existing_name.and_then(|n| n.comment.clone()),
        country: contact.and_then(|a| a.country.clone()),
        address1: contact.and_then(|a| a.address_1.clone()),
        address2: contact.and_then(|a| a.address_2.clone()),
        phone: contact.and_then(|c| c.phone.clone()),
        email: contact.and_then(|c| c.email.clone()),
        website: contact.and_then(|c| c.website.clone()),
        is_manufacturer: existing_name.map(|n| n.is_manufacturer).unwrap_or(false),
        is_donor: existing_name.map(|n| n.is_donor).unwrap_or(false),
        on_hold: existing_name.map(|n| n.on_hold).unwrap_or(false),
        next_of_kin_id: next_of_kin.clone().and_then(|n| n.id),
        next_of_kin_name: next_of_kin.and_then(|n| n.name),
        created_datetime: existing_name
            .and_then(|n| n.created_datetime)
            .or(Some(update_timestamp.naive_utc())), // assume there is no earlier doc version
        is_deceased: patient.is_deceased.unwrap_or(false),
        date_of_death,
        national_health_number: code_2,
        custom_data_string: None,
        deleted_datetime: existing_name.and_then(|name| name.deleted_datetime),
        // Supplier fields below are not used for patients, we set them to none
        hsh_code: None,
        hsh_name: None,
        margin: None,
        freight_factor: None,
        currency_id: None,
        custom_fields: existing_name.and_then(|n| n.custom_fields.clone()),
    })
}

/// Translates patient changes back to the document format, overwriting the document data.
///
/// The patient can divert from the document data when, for example, the patient details have been
/// changed in mSupply.
pub fn patient_draft_document(patient: &Patient, document_data: SchemaPatient) -> SchemaPatient {
    let doc_contact_details = document_data
        .contact_details
        .as_ref()
        .and_then(|c| c.first().cloned())
        .unwrap_or_default();
    let draft_contact_details = ContactDetails {
        address_1: patient.address1.clone(),
        address_2: patient.address2.clone(),
        country: patient.country.clone(),
        email: patient.email.clone(),
        phone: patient.phone.clone(),
        website: patient.website.clone(),
        ..doc_contact_details.clone()
    };
    let SchemaPatient {
        id: _,
        allergies,
        birth_place,
        code,
        code_2: _,
        contact_details,
        contacts,
        date_of_birth: _,
        date_of_birth_is_estimated,
        date_of_death: _,
        extension,
        first_name: _,
        last_name: _,
        gender: _,
        is_deceased,
        marital_status,
        middle_name,
        notes,
        passport_number,
        socio_economics,
        next_of_kin,
    } = document_data;
    SchemaPatient {
        id: patient.id.clone(),
        code: if patient.code.is_empty() {
            code
        } else {
            Some(patient.code.clone())
        },
        code_2: patient.national_health_number.clone(),
        first_name: patient.first_name.clone(),
        last_name: patient.last_name.clone(),
        gender: patient.gender.as_ref().map(|gender| match gender {
            GenderType::Female => SchemaGender::Female,
            GenderType::Male => SchemaGender::Male,
            GenderType::Transgender => SchemaGender::Transgender,
            GenderType::TransgenderMale => SchemaGender::TransgenderMale,
            GenderType::TransgenderMaleHormone => SchemaGender::TransgenderMaleHormone,
            GenderType::TransgenderMaleSurgical => SchemaGender::TransgenderMaleSurgical,
            GenderType::TransgenderFemale => SchemaGender::TransgenderFemale,
            GenderType::TransgenderFemaleHormone => SchemaGender::TransgenderFemaleHormone,
            GenderType::TransgenderFemaleSurgical => SchemaGender::TransgenderFemaleSurgical,
            GenderType::Unknown => SchemaGender::Unknown,
            GenderType::NonBinary => SchemaGender::NonBinary,
        }),
        contact_details: if doc_contact_details == draft_contact_details {
            contact_details
        } else {
            let mut contacts = vec![draft_contact_details];
            if let Some(contact_details) = contact_details {
                contacts.extend(contact_details.into_iter().skip(1));
            }
            Some(contacts)
        },
        date_of_birth: patient
            .date_of_birth
            .map(|date| date.format("%Y-%m-%d").to_string()),
        date_of_death: patient
            .date_of_death
            .map(|date| date.format("%Y-%m-%d").to_string()),

        middle_name,
        date_of_birth_is_estimated,
        is_deceased: Some(patient.is_deceased || is_deceased.unwrap_or(false)),
        notes,
        passport_number,
        socio_economics,
        allergies,
        birth_place,
        marital_status,
        contacts,
        extension,
        next_of_kin,
    }
}

/// The draft document as JSON, from the stored patient document's data.
///
/// `patient_draft_document` works on `SchemaPatient`, which only has the base patient schema's
/// fields, while a deployment's patient schema can add its own (a top-level `nationality`, a
/// `district` in a contact details entry). Every value in the stored data that the base schema
/// has no field for is carried over into the draft, at any depth, so saving the draft does not
/// drop it. A base schema field is always taken from the draft, so a value the patient row has
/// cleared stays cleared.
pub fn patient_draft_document_json(
    patient: &Patient,
    stored: serde_json::Value,
) -> Result<serde_json::Value, serde_json::Error> {
    let document_data: SchemaPatient = serde_json::from_value(stored.clone())?;
    // What the base schema reads from the stored data: a key missing here has no field in it
    let known = serde_json::to_value(&document_data)?;
    let mut draft = serde_json::to_value(patient_draft_document(patient, document_data))?;
    carry_over_unknown(&mut draft, &stored, &known);
    Ok(draft)
}

fn carry_over_unknown(
    draft: &mut serde_json::Value,
    stored: &serde_json::Value,
    known: &serde_json::Value,
) {
    use serde_json::Value;
    match (draft, stored, known) {
        (Value::Object(draft), Value::Object(stored), Value::Object(known)) => {
            for (key, stored_value) in stored {
                match known.get(key) {
                    Some(known_value) => {
                        if let Some(draft_value) = draft.get_mut(key) {
                            carry_over_unknown(draft_value, stored_value, known_value);
                        }
                    }
                    None => {
                        draft
                            .entry(key.clone())
                            .or_insert_with(|| stored_value.clone());
                    }
                }
            }
        }
        // Entries line up by position: the draft rebuilds the first contact details entry
        // from the stored one and keeps the rest in order
        (Value::Array(draft), Value::Array(stored), Value::Array(known)) => {
            for ((draft_item, stored_item), known_item) in draft.iter_mut().zip(stored).zip(known) {
                carry_over_unknown(draft_item, stored_item, known_item);
            }
        }
        _ => {}
    }
}

pub fn patient_name(first: &Option<String>, last: &Option<String>) -> String {
    let mut out = vec![];
    if let Some(last) = last {
        out.push(last.clone());
    }
    if let Some(first) = first {
        out.push(first.clone());
    }
    out.join(", ")
}

#[cfg(test)]
mod test {
    use chrono::{NaiveDate, Utc};
    use repository::{
        mock::{mock_form_schema_empty, MockDataInserts},
        test_db::setup_all,
        DocumentRegistryCategory, DocumentRegistryRow, DocumentRegistryRowRepository, EqualFilter,
        FormSchemaRowRepository, GenderType as GenderRepo, NameRow,
    };
    use util::constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE};

    use crate::{
        programs::patient::{
            patient_schema::{ContactDetails, Gender, SchemaPatient},
            PatientFilter, UpdateProgramPatient,
        },
        service_provider::ServiceProvider,
    };

    use serde_json::json;

    use super::{patient_draft_document, patient_draft_document_json, patient_to_name_row};

    #[actix_rt::test]
    async fn test_patient_table_update() {
        let (_, _, connection_manager, _) = setup_all(
            "patient_table_update",
            MockDataInserts::none().names().stores().name_store_joins(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        let service = &service_provider.patient_service;

        // dummy schema
        let schema = mock_form_schema_empty();
        FormSchemaRowRepository::new(&ctx.connection)
            .upsert_one(&schema)
            .unwrap();

        let registry_repo = DocumentRegistryRowRepository::new(&ctx.connection);
        registry_repo
            .upsert_one(&DocumentRegistryRow {
                id: "patient_id".to_string(),
                category: DocumentRegistryCategory::Patient,
                document_type: PATIENT_TYPE.to_string(),
                context_id: PATIENT_CONTEXT_ID.to_string(),
                name: None,
                form_schema_id: Some(schema.id.clone()),
                config: None,
                plugin_code: None,
                program_key: None,
            })
            .unwrap();

        let contact_details = ContactDetails {
            description: None,
            email: Some("myemail".to_string()),
            mobile: Some("45678".to_string()),
            phone: None,
            website: Some("mywebsite".to_string()),
            address_1: Some("firstaddressline".to_string()),
            address_2: Some("secondaddressline".to_string()),
            city: None,
            country: Some("mycountry".to_string()),
            district: None,
            region: None,
            zip_code: None,
        };
        let patient = SchemaPatient {
            id: "testId".to_string(),
            contact_details: Some(vec![contact_details.clone()]),
            date_of_birth: Some("2000-03-04".to_string()),
            first_name: Some("firstname".to_string()),
            last_name: Some("lastname".to_string()),
            gender: Some(Gender::TransgenderFemale),
            ..Default::default()
        };

        service
            .upsert_program_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                UpdateProgramPatient {
                    data: serde_json::to_value(patient.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .unwrap();

        let found_patient = service
            .get_patients(
                &ctx,
                None,
                Some(PatientFilter::new().id(EqualFilter::equal_to(patient.id.to_string()))),
                None,
                None,
            )
            .unwrap()
            .rows
            .pop()
            .unwrap();
        assert_eq!(found_patient.first_name, patient.first_name);
        assert_eq!(found_patient.last_name, patient.last_name);
        assert_eq!(
            found_patient.date_of_birth.map(|date| date.to_string()),
            patient.date_of_birth
        );
        assert_eq!(found_patient.phone, contact_details.phone);
        assert_eq!(found_patient.email, contact_details.email);
        assert_eq!(found_patient.website, contact_details.website);
        assert_eq!(found_patient.address1, contact_details.address_1);
        assert_eq!(found_patient.address2, contact_details.address_2);
        assert_eq!(found_patient.country, contact_details.country);

        // test additional fields (custom schemas are allowed to have additional fields)
        let mut patient = serde_json::to_value(patient.clone()).unwrap();
        let obj = patient.as_object_mut().unwrap();
        obj["id"] = serde_json::Value::String("patient2".to_string());
        obj.insert(
            "customData".to_string(),
            serde_json::Value::String("additionalValue".to_string()),
        );
        assert!(patient.get("customData").is_some());
        service
            .upsert_program_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                UpdateProgramPatient {
                    data: patient,
                    schema_id: schema.id,
                    parent: None,
                },
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn test_patient_document_draft_update() {
        let contact_details = ContactDetails {
            description: None,
            email: Some("myemail".to_string()),
            mobile: Some("45678".to_string()),
            phone: Some("12345678".to_string()),
            website: Some("mywebsite".to_string()),
            address_1: Some("firstaddressline".to_string()),
            address_2: Some("secondaddressline".to_string()),
            city: None,
            country: Some("mycountry".to_string()),
            district: None,
            region: None,
            zip_code: None,
        };
        // Include a second contact details entry to check that it is not affected by the name_row
        // change
        let contact_details_2 = ContactDetails {
            description: None,
            email: Some("myemail2".to_string()),
            mobile: Some("456782".to_string()),
            phone: Some("123456782".to_string()),
            website: Some("mywebsite2".to_string()),
            address_1: Some("firstaddressline2".to_string()),
            address_2: Some("secondaddressline2".to_string()),
            city: None,
            country: Some("mycountry2".to_string()),
            district: None,
            region: None,
            zip_code: None,
        };
        let patient = SchemaPatient {
            id: "testId".to_string(),
            contact_details: Some(vec![contact_details, contact_details_2]),
            date_of_birth: Some("2000-03-04".to_string()),
            date_of_death: Some("2023-03-04".to_string()),
            first_name: Some("firstname".to_string()),
            last_name: Some("lastname".to_string()),
            gender: Some(Gender::TransgenderFemale),
            ..Default::default()
        };

        let now = Utc::now();
        // Derive a name_row from the original patient
        let name_row = patient_to_name_row(None, &now, patient.clone(), None).unwrap();
        // Create a update name row and apply it to the patient document
        let name_row_update = NameRow {
            id: name_row.id,
            name: "new last, new first".to_string(),
            code: "new code".to_string(),
            r#type: name_row.r#type,
            is_customer: name_row.is_customer,
            is_supplier: name_row.is_supplier,
            supplying_store_id: Some("new store".to_string()),
            first_name: Some("new first".to_string()),
            last_name: Some("new last".to_string()),
            gender: Some(GenderRepo::Male),
            date_of_birth: Some(NaiveDate::from_ymd_opt(2001, 1, 2).unwrap()),
            phone: Some("123456783".to_string()),
            charge_code: name_row.charge_code,
            comment: name_row.comment,
            country: Some("new country".to_string()),
            address1: Some("new address1".to_string()),
            address2: Some("new address2".to_string()),
            email: Some("new email".to_string()),
            website: Some("new website".to_string()),
            is_manufacturer: name_row.is_manufacturer,
            is_donor: name_row.is_donor,
            on_hold: name_row.on_hold,
            next_of_kin_id: None,
            next_of_kin_name: None,
            created_datetime: Some(now.naive_utc()),
            is_deceased: true,
            national_health_number: Some("new nhn".to_string()),
            date_of_death: Some(NaiveDate::from_ymd_opt(2001, 1, 2).unwrap()),
            custom_data_string: None,
            deleted_datetime: None,
            // Supplier fields below are not used for patients, we set them to none
            hsh_code: None,
            hsh_name: None,
            margin: None,
            freight_factor: None,
            currency_id: None,
            custom_fields: None,
        };
        let updated_patient = patient_draft_document(&name_row_update, patient.clone());
        // Check that 2nd contact_details entry is not affected by the name_row change
        assert_eq!(
            updated_patient.contact_details.as_ref().unwrap()[1],
            patient.contact_details.as_ref().unwrap()[1]
        );

        // Some back end forth conversions between row and patient document
        let name_row_update_2 = patient_to_name_row(
            None,
            &now,
            updated_patient.clone(),
            Some(name_row_update.clone()),
        )
        .unwrap();
        assert_eq!(name_row_update, name_row_update_2);
        let updated_patient_2 = patient_draft_document(&name_row_update, updated_patient.clone());
        assert_eq!(updated_patient_2, updated_patient);
    }

    #[test]
    fn test_patient_draft_keeps_fields_outside_the_base_schema() {
        let patient = SchemaPatient {
            id: "testId".to_string(),
            code: Some("code".to_string()),
            first_name: Some("first".to_string()),
            last_name: Some("last".to_string()),
            date_of_death: Some("2023-03-04".to_string()),
            is_deceased: Some(true),
            contact_details: Some(vec![
                ContactDetails {
                    phone: Some("111".to_string()),
                    ..Default::default()
                },
                ContactDetails {
                    phone: Some("222".to_string()),
                    ..Default::default()
                },
            ]),
            ..Default::default()
        };
        // A deployment's patient schema adds fields of its own, at the top level and inside
        // a contact details entry
        let mut stored = serde_json::to_value(&patient).unwrap();
        stored["nationality"] = json!("Djiboutian");
        stored["region"] = json!({ "name": "Arta", "code": 3 });
        stored["contactDetails"][0]["district"] = json!("Balbala");
        stored["contactDetails"][1]["district"] = json!("Ambouli");

        // The patient row has since changed the phone and cleared the date of death
        let now = Utc::now();
        let mut row = patient_to_name_row(None, &now, patient, None).unwrap();
        row.phone = Some("333".to_string());
        row.date_of_death = None;

        let draft = patient_draft_document_json(&row, stored).unwrap();

        assert_eq!(draft["nationality"], json!("Djiboutian"));
        assert_eq!(draft["region"], json!({ "name": "Arta", "code": 3 }));
        assert_eq!(draft["contactDetails"][0]["district"], json!("Balbala"));
        assert_eq!(draft["contactDetails"][1]["district"], json!("Ambouli"));
        // The base schema's fields still come from the patient row
        assert_eq!(draft["contactDetails"][0]["phone"], json!("333"));
        assert_eq!(draft["contactDetails"][1]["phone"], json!("222"));
        assert!(draft.get("dateOfDeath").map_or(true, |v| v.is_null()));
    }
}
