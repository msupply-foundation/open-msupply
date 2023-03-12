use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{
        date_option_to_isostring, empty_str_as_option, empty_str_as_option_string,
        zero_date_as_option,
    },
};
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, Gender, NameRow, NameRowRepository, NameType,
    StorageConnection, SyncBufferRow,
};

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
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub name: String,
    pub code: String,
    pub r#type: LegacyNameType,
    #[serde(rename = "customer")]
    pub is_customer: bool,
    #[serde(rename = "supplier")]
    pub is_supplier: bool,

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

    #[serde(deserialize_with = "empty_str_as_option")]
    pub national_health_number: Option<String>,

    #[serde(rename = "isDeceased")]
    pub is_deceased: bool,
    #[serde(rename = "om_created_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_datetime: Option<NaiveDateTime>,
    #[serde(rename = "om_gender")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub gender: Option<Gender>,
}

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::NAME;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}

fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Name
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
            id: data.id.to_string(),
            name: data.name.to_string(),
            r#type: data.r#type.to_name_type(),
            code: data.code.to_string(),
            is_customer: data.is_customer,
            is_supplier: data.is_supplier,

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
            is_deceased: data.is_deceased,
            national_health_number: data.national_health_number,
            gender: data.gender.or(if data.r#type == LegacyNameType::Patient {
                if data.female {
                    Some(Gender::Female)
                } else {
                    Some(Gender::Male)
                }
            } else {
                None
            }),
            created_datetime: data
                .created_date
                .map(|date| date.and_hms_opt(0, 0, 0).unwrap()),
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

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

        let NameRow {
            id,
            name,
            code,
            r#type,
            is_customer,
            is_supplier,
            supplying_store_id,
            first_name,
            last_name,
            gender,
            date_of_birth,
            phone,
            charge_code,
            comment,
            country,
            address1,
            address2,
            email,
            website,
            is_manufacturer,
            is_donor,
            on_hold,
            created_datetime,
            is_deceased,
            national_health_number,
        } = NameRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Name row ({}) not found",
                changelog.record_id
            )))?;

        // Only push name records that belong to patients, gracefully ignore the rest
        let patient_type = match r#type {
            NameType::Patient => LegacyNameType::Patient,
            _ => return Ok(None),
        };

        let legacy_row = LegacyNameRow {
            id,
            name,
            code,
            r#type: patient_type,
            is_customer,
            is_supplier,
            supplying_store_id,
            first_name,
            last_name,
            female: gender.clone().map(|g| g == Gender::Female).unwrap_or(false),
            date_of_birth,
            phone,
            charge_code,
            comment,
            country,
            address1,
            address2,
            email,
            website,
            is_manufacturer,
            is_donor,
            on_hold,
            created_date: created_datetime.map(|datetime| datetime.date()),
            national_health_number,
            is_deceased,
            created_datetime,
            gender,
        };

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }

    fn try_translate_push_delete(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        let result = match_push_table(changelog)
            .then(|| vec![RemoteSyncRecordV5::new_delete(changelog, LEGACY_TABLE_NAME)]);

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
