use crate::sync::sync_serde::{
    date_option_to_isostring, empty_str_as_option_string, zero_date_as_option,
};
use chrono::NaiveDate;
use repository::{Gender, NameRow, NameType, StorageConnection, SyncBufferRow};

use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullUpsertRecord, SyncTranslation,
};

#[derive(Deserialize, Serialize, Debug, PartialEq)]
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

    // pub fn from_name_type(name_type: &NameType) -> Self {
    //     match name_type {
    //         NameType::Facility => LegacyNameType::Facility,
    //         NameType::Patient => LegacyNameType::Patient,
    //         NameType::Build => LegacyNameType::Build,
    //         NameType::Invad => LegacyNameType::Invad,
    //         NameType::Repack => LegacyNameType::Repack,
    //         NameType::Store => LegacyNameType::Store,
    //         NameType::Others => LegacyNameType::Others,
    //     }
    // }
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

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub supplying_store_id: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "first")]
    pub first_name: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "last")]
    pub last_name: Option<String>,

    pub female: bool,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_of_birth: Option<NaiveDate>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub phone: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "charge code")]
    pub charge_code: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub country: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "bill_address1")]
    pub address1: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "bill_address2")]
    pub address2: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub email: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "url")]
    pub website: Option<String>,

    #[serde(rename = "manufacturer")]
    pub is_manufacturer: bool,
    #[serde(rename = "donor")]
    pub is_donor: bool,
    #[serde(rename = "hold")]
    pub on_hold: bool,

    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub created_date: Option<NaiveDate>,
    // TODO not in mSupply:
    //pub om_created_datetime: Option<NaiveDateTime>,
    //pub om_gender: Option<Gender>,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::NAME
}

pub(crate) struct NameTranslation {}
impl SyncTranslation for NameTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyNameRow>(&sync_record.data)?;

        let result = NameRow {
            id: data.ID.to_string(),
            name: data.name.to_string(),
            r#type: data.r#type.to_name_type(),
            code: data.code.to_string(),
            is_customer: data.customer,
            is_supplier: data.supplier,

            supplying_store_id: data.supplying_store_id,
            first_name: data.first_name,
            last_name: data.last_name,
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

            // TODO replace once mSupply support new fields
            gender: if data.r#type == LegacyNameType::Patient {
                if data.female {
                    Some(Gender::Female)
                } else {
                    Some(Gender::Male)
                }
            } else {
                None
            },
            created_datetime: data
                .created_date
                .map(|date| date.and_hms_opt(0, 0, 0).unwrap()),
            /*
            gender: data.om_gender.or(if data.female {
                Some(Gender::Female)
            } else {
                Some(Gender::Male)
            }),
            created_datetime: data
                .om_created_datetime
                .or(data.created_date.map(|date| date.and_hms(0, 0, 0))),
                */
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Name(result),
        )))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(&sync_record.record_id, PullDeleteRecordTable::Name)
        });

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_translation() {
        use crate::sync::test::test_data::name as test_data;
        let translator = NameTranslation {};

        let (_, connection, _, _) =
            setup_all("test_name_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
