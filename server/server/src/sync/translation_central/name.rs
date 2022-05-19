use crate::sync::{
    sync_serde::{empty_str_as_option, zero_date_as_option},
    translation_central::TRANSLATION_RECORD_NAME,
};
use chrono::{NaiveDate, NaiveDateTime};
use repository::{CentralSyncBufferRow, Gender, NameRow, NameType};

use serde::{Deserialize, Serialize};

use super::{CentralPushTranslation, IntegrationUpsertRecord};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyNameType {
    #[serde(rename = "facility")]
    Facility,
    #[serde(rename = "patient")]
    Patient,
    #[serde(rename = "build")]
    Build,
    #[serde(rename = "invad")]
    Invad,
    #[serde(rename = "repack")]
    Repack,
    #[serde(rename = "store")]
    Store,

    #[serde(other)]
    Others,
}

impl LegacyNameType {
    fn to_name_type(&self) -> NameType {
        match self {
            LegacyNameType::Facility => NameType::Facility,
            LegacyNameType::Patient => NameType::Patient,
            LegacyNameType::Build => NameType::Build,
            LegacyNameType::Invad => NameType::Invad,
            LegacyNameType::Repack => NameType::Repack,
            LegacyNameType::Store => NameType::Store,
            LegacyNameType::Others => NameType::Others,
        }
    }

    pub fn from_name_type(name_type: &NameType) -> Self {
        match name_type {
            NameType::Facility => LegacyNameType::Facility,
            NameType::Patient => LegacyNameType::Patient,
            NameType::Build => LegacyNameType::Build,
            NameType::Invad => LegacyNameType::Invad,
            NameType::Repack => LegacyNameType::Repack,
            NameType::Store => LegacyNameType::Store,
            NameType::Others => LegacyNameType::Others,
        }
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameRow {
    pub ID: String,
    pub name: String,
    pub code: String,
    pub r#type: LegacyNameType,
    pub customer: bool,
    pub supplier: bool,

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "first")]
    pub first_name: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "last")]
    pub last_name: Option<String>,

    pub female: bool,
    #[serde(deserialize_with = "zero_date_as_option")]
    pub date_of_birth: Option<NaiveDate>,

    #[serde(deserialize_with = "empty_str_as_option")]
    pub phone: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "charge code")]
    pub charge_code: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub country: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "bill_address1")]
    pub address1: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "bill_address2")]
    pub address2: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option")]
    pub email: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "url")]
    pub website: Option<String>,

    #[serde(rename = "manufacturer")]
    pub is_manufacturer: bool,
    #[serde(rename = "donor")]
    pub is_donor: bool,
    #[serde(rename = "hold")]
    pub on_hold: bool,

    #[serde(deserialize_with = "zero_date_as_option")]
    pub created_date: Option<NaiveDate>,

    // TODO not in mSupply:
    pub om_created_datetime: Option<NaiveDateTime>,
    pub om_gender: Option<Gender>,
}

pub fn translate_name(data: LegacyNameRow) -> NameRow {
    NameRow {
        id: data.ID.to_string(),
        name: data.name.to_string(),
        r#type: data.r#type.to_name_type(),
        code: data.code.to_string(),
        is_customer: data.customer,
        is_supplier: data.supplier,

        first_name: data.first_name,
        last_name: data.last_name,
        gender: data.om_gender.or(if data.female {
            Some(Gender::Female)
        } else {
            Some(Gender::Male)
        }),
        date_of_birth: data.date_of_birth,
        phone: data.phone,
        charge_code: data.charge_code,
        comment: data.comment,
        country: data.country,
        address1: data.address1,
        address2: data.address2,
        email: data.email,
        website: data.website,
        is_manufacturer: data.is_manufacturer,
        is_donor: data.is_donor,
        on_hold: data.on_hold,
        created_datetime: data
            .om_created_datetime
            .or(data.created_date.map(|date| date.and_hms(0, 0, 0))),
    }
}

pub struct NameTranslation {}
impl CentralPushTranslation for NameTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_NAME;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyNameRow>(&sync_record.data)?;
        Ok(Some(IntegrationUpsertRecord::Name(translate_name(data))))
    }
}

#[cfg(test)]
mod tests {
    use super::CentralPushTranslation;
    use crate::sync::translation_central::{
        name::NameTranslation,
        test_data::{name::get_test_name_records, TestSyncDataRecord},
        IntegrationUpsertRecord,
    };

    #[test]
    fn test_name_translation() {
        for record in get_test_name_records() {
            match record.translated_record {
                TestSyncDataRecord::Name(translated_record) => {
                    assert_eq!(
                        NameTranslation {}
                            .try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
                        translated_record.map(|r| (IntegrationUpsertRecord::Name(r))),
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
