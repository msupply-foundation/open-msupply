use chrono::{DateTime, NaiveDate, Utc};
use repository::{
    EqualFilter, Gender, NameRow, NameRowRepository, NameStoreJoinFilter, NameStoreJoinRepository,
    NameStoreJoinRow, NameType, Patient, RepositoryError, StorageConnection,
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
) -> Result<(), RepositoryError> {
    let name_store_join = NameStoreJoinRepository::new(con)
        .query_by_filter(NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(name_id)))?
        .pop();
    if name_store_join.is_none() {
        // add name store join
        let name_store_join_repo = NameStoreJoinRepository::new(con);
        name_store_join_repo.upsert_one(&NameStoreJoinRow {
            id: uuid(),
            name_id: name_id.to_string(),
            store_id: store_id.to_string(),
            name_is_customer: true,
            name_is_supplier: false,
        })?;
    }
    Ok(())
}

/// Callback called when a patient document has been updated
/// Updates the names table for the updated patient.
pub fn update_patient_row(
    con: &StorageConnection,
    store_id: Option<String>,
    update_timestamp: &DateTime<Utc>,
    patient: SchemaPatient,
    is_sync_update: bool,
) -> Result<(), UpdateProgramPatientError> {
    let SchemaPatient {
        id,
        code,
        code_2,
        contact_details,
        date_of_birth,
        first_name,
        last_name,
        gender,
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
    let contact = contact_details.as_ref().and_then(|it| it.get(0));
    let date_of_birth = match date_of_birth {
        Some(date_of_birth) => Some(NaiveDate::from_str(&date_of_birth).map_err(|err| {
            UpdateProgramPatientError::InternalError(format!(
                "Invalid date of birth format: {}",
                err
            ))
        })?),
        None => None,
    };
    let date_of_death = match date_of_death {
        Some(date_of_death) => Some(NaiveDate::from_str(&date_of_death).map_err(|err| {
            UpdateProgramPatientError::InternalError(format!(
                "Invalid date of death format: {}",
                err
            ))
        })?),
        None => None,
    };
    let name_repo = NameRowRepository::new(con);
    let existing_name = name_repo.find_one_by_id(&id)?;
    let existing_name = existing_name.as_ref();

    let name_upsert = NameRow {
        id: id.clone(),
        name: patient_name(&first_name, &last_name),
        code: code.unwrap_or("".to_string()),
        r#type: NameType::Patient,
        is_customer: existing_name.map(|n| n.is_customer).unwrap_or(true),
        is_supplier: existing_name.map(|n| n.is_supplier).unwrap_or(false),
        // supplying_store_id is the home store for a patient and is needed for mSupply compatibility
        supplying_store_id: existing_name
            .and_then(|n| n.supplying_store_id.clone())
            .or(store_id),
        first_name,
        last_name,
        gender: gender.map(|g| match g {
            SchemaGender::Female => Gender::Female,
            SchemaGender::Male => Gender::Male,
            SchemaGender::Transgender => Gender::Transgender,
            SchemaGender::TransgenderMale => Gender::TransgenderMale,
            SchemaGender::TransgenderMaleHormone => Gender::TransgenderMaleHormone,
            SchemaGender::TransgenderMaleSurgical => Gender::TransgenderMaleSurgical,
            SchemaGender::TransgenderFemale => Gender::TransgenderFemale,
            SchemaGender::TransgenderFemaleHormone => Gender::TransgenderFemaleHormone,
            SchemaGender::TransgenderFemaleSurgical => Gender::TransgenderFemaleSurgical,
            SchemaGender::Unknown => Gender::Unknown,
            SchemaGender::NonBinary => Gender::NonBinary,
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
        created_datetime: existing_name
            .and_then(|n| n.created_datetime.clone())
            .or(Some(update_timestamp.naive_utc())), // assume there is no earlier doc version
        is_deceased: patient.is_deceased.unwrap_or(false),
        date_of_death,
        national_health_number: code_2,
    };

    if is_sync_update {
        name_repo.sync_upsert_one(&name_upsert)?;
    } else {
        name_repo.upsert_one(&name_upsert)?;
    }

    Ok(())
}

/// Translates patient changes back to the document format, overwriting the document data.
///
/// The patient can divert from the document data when, for example, the patient details have been
/// changed in mSupply.
pub fn patient_draft_document(patient: &Patient, document_data: SchemaPatient) -> SchemaPatient {
    let contact_details = document_data
        .contact_details
        .as_ref()
        .and_then(|c| c.get(0).map(|c| c.clone()))
        .unwrap_or(ContactDetails::default());
    let draft_contact_details = ContactDetails {
        address_1: patient.address1.clone(),
        address_2: patient.address2.clone(),
        country: patient.country.clone(),
        email: patient.email.clone(),
        phone: patient.phone.clone(),
        website: patient.website.clone(),
        ..contact_details.clone()
    };
    SchemaPatient {
        id: patient.id.clone(),
        code: if patient.code == "" {
            document_data.code
        } else {
            Some(patient.code.clone())
        },
        code_2: patient.national_health_number.clone(),
        first_name: patient.first_name.clone(),
        last_name: patient.last_name.clone(),
        gender: patient.gender.as_ref().map(|gender| match gender {
            Gender::Female => SchemaGender::Female,
            Gender::Male => SchemaGender::Male,
            Gender::Transgender => SchemaGender::Transgender,
            Gender::TransgenderMale => SchemaGender::TransgenderMale,
            Gender::TransgenderMaleHormone => SchemaGender::TransgenderMaleHormone,
            Gender::TransgenderMaleSurgical => SchemaGender::TransgenderMaleSurgical,
            Gender::TransgenderFemale => SchemaGender::TransgenderFemale,
            Gender::TransgenderFemaleHormone => SchemaGender::TransgenderFemaleHormone,
            Gender::TransgenderFemaleSurgical => SchemaGender::TransgenderFemaleSurgical,
            Gender::Unknown => SchemaGender::Unknown,
            Gender::NonBinary => SchemaGender::NonBinary,
        }),
        contact_details: if contact_details == draft_contact_details {
            document_data.contact_details
        } else {
            let mut contacts = vec![draft_contact_details];
            if let Some(contact_details) = document_data.contact_details {
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

        middle_name: document_data.middle_name,
        date_of_birth_is_estimated: document_data.date_of_birth_is_estimated,
        is_deceased: Some(patient.is_deceased || document_data.is_deceased.unwrap_or(false)),
        notes: document_data.notes,
        passport_number: document_data.passport_number,
        socio_economics: document_data.socio_economics,
        allergies: document_data.allergies,
        birth_place: document_data.birth_place,
        marital_status: document_data.marital_status,
        contacts: document_data.contacts,
        extension: document_data.extension,
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
    use repository::{
        mock::{mock_form_schema_empty, MockDataInserts},
        test_db::setup_all,
        DocumentRegistryCategory, DocumentRegistryRow, DocumentRegistryRowRepository, EqualFilter,
        FormSchemaRowRepository,
    };
    use util::{
        constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE},
        inline_init,
    };

    use crate::{
        programs::patient::{
            patient_schema::{ContactDetails, Gender, SchemaPatient},
            PatientFilter, UpdateProgramPatient,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn test_patient_table_update() {
        let (_, _, connection_manager, _) = setup_all(
            "patient_table_update",
            MockDataInserts::none().names().stores().name_store_joins(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "");
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
        let patient = inline_init(|p: &mut SchemaPatient| {
            p.id = "testId".to_string();
            p.contact_details = Some(vec![contact_details.clone()]);
            p.date_of_birth = Some("2000-03-04".to_string());
            p.first_name = Some("firstname".to_string());
            p.last_name = Some("lastname".to_string());
            p.gender = Some(Gender::TransgenderFemale);
        });

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
                Some(PatientFilter::new().id(EqualFilter::equal_to(&patient.id))),
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
        assert_eq!(found_patient.phone, contact_details.mobile);
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
}
