use chrono::{DateTime, NaiveDate, Utc};
use repository::{
    EqualFilter, Gender, NameFilter, NameRepository, NameRow, NameRowRepository,
    NameStoreJoinRepository, NameStoreJoinRow, NameType, StorageConnection,
};
use std::str::FromStr;
use util::uuid::uuid;

use super::{
    patient_schema::{SchemaGender, SchemaPatient},
    UpdatePatientError,
};

/// Callback called when the document has been updated
pub fn patient_document_updated(
    con: &StorageConnection,
    store_id: &str,
    update_timestamp: &DateTime<Utc>,
    patient: SchemaPatient,
) -> Result<(), UpdatePatientError> {
    let contact = patient.contact_details.get(0);
    let date_of_birth = match patient.date_of_birth {
        Some(date_of_birth) => Some(NaiveDate::from_str(&date_of_birth).map_err(|err| {
            UpdatePatientError::InternalError(format!("Invalid date of birth format: {}", err))
        })?),
        None => None,
    };
    let address = patient.contact_details.get(0);
    let name_repo = NameRowRepository::new(con);
    let existing_name = name_repo.find_one_by_id(&patient.id)?;
    name_repo.upsert_one(&NameRow {
        id: patient.id.clone(),
        name: patient_name(&patient.first_name, &patient.last_name),
        code: patient.code.unwrap_or("".to_string()),
        r#type: NameType::Patient,
        is_customer: true,
        is_supplier: false,
        supplying_store_id: Some(store_id.to_string()),
        first_name: patient.first_name,
        last_name: patient.last_name,
        gender: patient.gender.and_then(|g| match g {
            SchemaGender::Female => Some(Gender::Female),
            SchemaGender::Male => Some(Gender::Male),
            SchemaGender::Transgender => Some(Gender::Transgender),
            SchemaGender::TransgenderMale => Some(Gender::TransgenderMale),
            SchemaGender::TransgenderFemale => Some(Gender::TransgenderFemale),
            SchemaGender::Unknown => Some(Gender::Unknown),
            SchemaGender::NonBinary => Some(Gender::NonBinary),
        }),
        date_of_birth,
        charge_code: None,
        comment: None,
        country: address.and_then(|a| a.country.clone()),
        address1: address.and_then(|a| a.address_1.clone()),
        address2: address.and_then(|a| a.address_2.clone()),
        phone: contact.and_then(|c| c.phone.clone().or(c.mobile.clone())),
        email: contact.and_then(|c| c.email.clone()),
        website: contact.and_then(|c| c.website.clone()),
        is_manufacturer: false,
        is_donor: false,
        on_hold: false,
        created_datetime: existing_name
            .as_ref()
            .and_then(|n| n.created_datetime.clone())
            .or(Some(update_timestamp.naive_utc())), // assume there is no earlier doc version
        is_deceased: patient.is_deceased,
        national_health_number: patient.code_2,
    })?;
    let name_repo = NameRepository::new(con);
    let name = name_repo.query_one(
        store_id,
        NameFilter::new()
            .is_customer(true)
            .id(EqualFilter::equal_to(&patient.id)),
    )?;
    if name.is_none() {
        // add name store join
        let name_store_join_repo = NameStoreJoinRepository::new(con);
        name_store_join_repo.upsert_one(&NameStoreJoinRow {
            id: uuid(),
            name_id: patient.id,
            store_id: store_id.to_string(),
            name_is_customer: true,
            name_is_supplier: false,
        })?;
    }
    Ok(())
}

fn patient_name(first: &Option<String>, last: &Option<String>) -> String {
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
        EqualFilter, FormSchemaRowRepository,
    };
    use util::inline_init;

    use crate::{
        programs::patient::{
            patient_schema::{ContactDetails, Gender, SchemaPatient},
            PatientFilter, UpdatePatient,
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
            p.contact_details = vec![contact_details.clone()];
            p.date_of_birth = Some("2000-03-04".to_string());
            p.first_name = Some("firstname".to_string());
            p.last_name = Some("lastname".to_string());
            p.gender = Some(Gender::TransgenderFemale);
        });

        service
            .update_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                UpdatePatient {
                    data: serde_json::to_value(patient.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .unwrap();

        let found_patient = service
            .get_patients(
                &ctx,
                "store_a",
                None,
                Some(PatientFilter::new().id(EqualFilter::equal_to(&patient.id))),
                None,
            )
            .unwrap()
            .rows
            .pop()
            .unwrap();
        assert_eq!(found_patient.name_row.first_name, patient.first_name);
        assert_eq!(found_patient.name_row.last_name, patient.last_name);
        assert_eq!(
            found_patient
                .name_row
                .date_of_birth
                .map(|date| date.to_string()),
            patient.date_of_birth
        );
        assert_eq!(found_patient.name_row.phone, contact_details.mobile);
        assert_eq!(found_patient.name_row.email, contact_details.email);
        assert_eq!(found_patient.name_row.website, contact_details.website);
        assert_eq!(found_patient.name_row.address1, contact_details.address_1);
        assert_eq!(found_patient.name_row.address2, contact_details.address_2);
        assert_eq!(found_patient.name_row.country, contact_details.country);

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
            .update_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                UpdatePatient {
                    data: patient,
                    schema_id: schema.id,
                    parent: None,
                },
            )
            .unwrap();
    }
}
