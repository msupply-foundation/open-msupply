use std::str::FromStr;

use chrono::NaiveDate;
use repository::{StorageConnection, Document, NameRowRepository, NameRow, NameType, Gender as NameRowGender};

extern crate serde;
extern crate schemafy_core;
extern crate serde_json;

use serde::{Serialize, Deserialize};

use super::document_service::DocumentInsertError;


schemafy::schemafy!(
  "src/document/schemas/patient.json"
);

/// Callback called when the document has been updated
pub fn document_updated(con: &StorageConnection, store_id: &str, doc: &Document) -> Result<(), DocumentInsertError> {
  match doc.r#type.as_str() {
    "Patient" => {
      let patient: Patient = serde_json::from_value(doc.data.clone()).map_err(|err| DocumentInsertError::InternalError(format!("Invalid date of birth format: {}", err)))?;
      let contact = patient.contact_details.get(0);
      let date_of_birth =  match patient.date_of_birth{
        Some(date_of_birth ) => Some(NaiveDate::from_str(&date_of_birth).map_err(|err| DocumentInsertError::InternalError(format!("Invalid date of birth format: {}", err)))?),
        None => None
      };
      let address = patient.addresses.get(0);
      let name_repo = NameRowRepository::new(con);
      name_repo.upsert_one(&NameRow {
        id: format!("{}@{}", patient.id, store_id),
        name: patient.id,
        code: "program_patient".to_string(),
        r#type: NameType::Patient,
        is_customer: false,
        is_supplier: false,
        supplying_store_id: Some(store_id.to_string()),
        first_name: patient.first_name,
        last_name: patient.last_name,
        gender: patient.gender.and_then(|g| match g {
          Gender::Female => Some(NameRowGender::Female),
          Gender::Male => Some(NameRowGender::Male),
          Gender::TransgenderMale => Some(NameRowGender::TransgenderMale),
          Gender::TransgenderFemale => Some(NameRowGender::TransgenderFemale),
          Gender::Unknown => Some(NameRowGender::Unknown),
          Gender::NonBinary => Some(NameRowGender::NonBinary),
        }),
        date_of_birth,
        charge_code: None,
        comment: None,
        country: address.and_then(|a| a.country.clone()),
        address1: address.and_then(|a| a.address_1.clone()),
        address2: address.and_then(|a| a.address_2.clone()),
        phone: contact.and_then(|c|c.phone.clone().or(c.mobile.clone())),
        email: contact.and_then(|c|c.email.clone()),
        website: contact.and_then(|c|c.website.clone()),
        is_manufacturer: false,
        is_donor: false,
        on_hold: false,
        created_datetime: None,
    })?;
      Ok(())
    }
    _ => Ok(())
  }
}
