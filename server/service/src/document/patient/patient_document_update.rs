use chrono::NaiveDate;
use repository::{
    Document, Gender, NameRow, NameRowRepository, NameStoreJoinRepository, NameStoreJoinRow,
    NameType, StorageConnection,
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
    let patient_name = |first: &Option<String>, last: &Option<String>| {
        let mut out = vec![];
        if let Some(first) = first {
            out.push(first.clone());
        }
        if let Some(last) = last {
            out.push(last.clone());
        }
        out.join(",")
    };
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
    if existing_name.is_none() {
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
