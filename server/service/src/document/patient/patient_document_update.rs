use chrono::NaiveDate;
use repository::{
    Document, EqualFilter, Gender, NameFilter, NameRepository, NameRow, NameRowRepository,
    NameStoreJoinRepository, NameStoreJoinRow, NameType, StorageConnection,
};
use std::str::FromStr;
use util::uuid::uuid;

use crate::document::document_service::DocumentInsertError;

use super::patient_schema::{SchemaGender, SchemaPatient};

/// Callback called when the document has been updated
pub fn patient_document_updated(
    con: &StorageConnection,
    store_id: &str,
    doc: &Document,
) -> Result<(), DocumentInsertError> {
    let patient: SchemaPatient = serde_json::from_value(doc.data.clone()).map_err(|err| {
        DocumentInsertError::InternalError(format!("Invalid patient data: {}", err))
    })?;
    let contact = patient.contact_details.get(0);
    let date_of_birth = match patient.date_of_birth {
        Some(date_of_birth) => Some(NaiveDate::from_str(&date_of_birth).map_err(|err| {
            DocumentInsertError::InternalError(format!("Invalid date of birth format: {}", err))
        })?),
        None => None,
    };
    let address = patient.addresses.get(0);
    let name_repo = NameRowRepository::new(con);
    let existing_name = name_repo.find_one_by_id(&patient.id)?;
    name_repo.upsert_one(&NameRow {
        id: patient.id.clone(),
        name: patient_name(&patient.first_name, &patient.last_name),
        code: "program_patient".to_string(),
        r#type: NameType::Patient,
        is_customer: true,
        is_supplier: false,
        supplying_store_id: Some(store_id.to_string()),
        first_name: patient.first_name,
        last_name: patient.last_name,
        gender: patient.gender.and_then(|g| match g {
            SchemaGender::Female => Some(Gender::Female),
            SchemaGender::Male => Some(Gender::Male),
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
            .or(Some(doc.timestamp.naive_utc())), // assume there is no earlier doc version
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
    use chrono::Utc;
    use repository::{mock::MockDataInserts, test_db::setup_all, EqualFilter};

    use crate::{
        document::{
            patient::{
                patient_schema::{Address, ContactDetails, Gender, Patient, SocioEconomics},
                PatientFilter, PATIENT_TYPE,
            },
            raw_document::RawDocument,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn test_patient_table_update() {
        let (_, _, connection_manager, _) = setup_all(
            "patient_table_update",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let ctx = service_provider.context().unwrap();

        let service = service_provider.document_service;
        let address = Address {
            address_1: Some("firstaddressline".to_string()),
            address_2: Some("secondaddressline".to_string()),
            city: None,
            country: Some("mycountry".to_string()),
            description: None,
            district: None,
            key: "key".to_string(),
            region: None,
            zip_code: None,
        };
        let contact_details = ContactDetails {
            description: None,
            email: Some("myemail".to_string()),
            key: "key".to_string(),
            mobile: Some("45678".to_string()),
            phone: None,
            website: Some("mywebsite".to_string()),
        };
        let patient = Patient {
            id: "testid".to_string(),
            national_id: None,
            addresses: vec![address.clone()],
            contact_details: vec![contact_details.clone()],
            date_of_birth: Some("2000-03-04".to_string()),
            date_of_birth_is_estimated: None,
            family: None,
            first_name: Some("firstname".to_string()),
            last_name: Some("lastname".to_string()),
            gender: Some(Gender::TransgenderFemale),
            health_center: None,
            passport_number: None,
            socio_economics: SocioEconomics {
                education: None,
                literate: None,
                occupation: None,
            },
        };
        service
            .update_document(
                &ctx,
                "store_a",
                RawDocument {
                    name: "test/doc".to_string(),
                    parents: vec![],
                    author: "some_user".to_string(),
                    timestamp: Utc::now(),
                    r#type: PATIENT_TYPE.to_string(),
                    data: serde_json::to_value(patient.clone()).unwrap(),
                    // TODO add and use patient id schema
                    schema_id: None,
                },
            )
            .unwrap();

        let found_patient = service_provider
            .patient_service
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
        assert_eq!(found_patient.name_row.address1, address.address_1);
        assert_eq!(found_patient.name_row.address2, address.address_2);
        assert_eq!(found_patient.name_row.country, address.country);

        // test additional fields (custom schemas are allowed to have additional fields)
        let mut patient = serde_json::to_value(patient.clone()).unwrap();
        let obj = patient.as_object_mut().unwrap();
        obj.insert(
            "customData".to_string(),
            serde_json::Value::String("additionalValue".to_string()),
        );
        assert!(patient.get("customData").is_some());
        service
            .update_document(
                &ctx,
                "store_a",
                RawDocument {
                    name: "test/doc2".to_string(),
                    parents: vec![],
                    author: "some_user".to_string(),
                    timestamp: Utc::now(),
                    r#type: PATIENT_TYPE.to_string(),
                    data: patient,
                    // TODO add and use patient id schema
                    schema_id: None,
                },
            )
            .unwrap();
    }
}
