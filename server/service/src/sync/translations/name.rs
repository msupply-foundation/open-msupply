use crate::sync::sync_serde::{
    date_option_to_isostring, empty_str_as_option, empty_str_as_option_string, zero_date_as_option,
};
use anyhow::Context;
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, Gender, NameRow, NameRowDelete, NameRowRepository, NameType,
    StorageConnection, SyncBufferRow,
};

use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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
    #[serde(rename = "om_date_of_death")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_of_death: Option<NaiveDate>,
    pub custom_data: Option<serde_json::Value>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameTranslation)
}

pub(super) struct NameTranslation;
impl SyncTranslation for NameTranslation {
    fn table_name(&self) -> &str {
        "name"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Name)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyNameRow {
            id,
            name,
            code,
            r#type: legacy_type,
            is_customer,
            is_supplier,
            supplying_store_id,
            first_name,
            last_name,
            female,
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
            created_date,
            national_health_number,
            is_deceased,
            created_datetime,
            gender,
            date_of_death,
            custom_data,
        } = serde_json::from_str::<LegacyNameRow>(&sync_record.data)?;

        // Custom data for facility or name only (for others, say patient, don't need to have extra overhead or push translation back to json)
        let r#type = legacy_type.to_name_type();
        let custom_data_string = r#type
            .is_facility_or_store()
            .then(|| custom_data.as_ref().map(serde_json::to_string))
            .flatten()
            .transpose()
            .context("Error serialising custom data to string")?;

        let existing_name = NameRowRepository::new(connection).find_one_by_id(&id)?;
        let result = NameRow {
            id,
            name,
            r#type,
            code,
            is_customer,
            is_supplier,
            supplying_store_id,
            first_name,
            last_name,
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
            is_deceased,
            national_health_number,
            gender: gender.or(if legacy_type == LegacyNameType::Patient {
                if female {
                    Some(Gender::Female)
                } else {
                    Some(Gender::Male)
                }
            } else {
                None
            }),
            created_datetime: created_datetime
                .or(created_date.map(|date| date.and_hms_opt(0, 0, 0).unwrap())),
            date_of_death,
            custom_data_string,
            deleted_datetime: existing_name.and_then(|name| name.deleted_datetime),
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(NameRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
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
            date_of_death,
            national_health_number,
            // See comment in pull translation
            custom_data_string: _,
            deleted_datetime,
        } = NameRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Name row ({}) not found",
                changelog.record_id
            )))?;
        if deleted_datetime.is_some() {
            return Ok(PushTranslateResult::Ignored(
                "Ignore pushing soft deleted name".to_string(),
            ));
        }

        let patient_type = match r#type {
            NameType::Patient => LegacyNameType::Patient,
            _ => {
                return Ok(PushTranslateResult::Ignored(
                    "Only push name records that belong to patients".to_string(),
                ))
            }
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
            date_of_death,
            custom_data: None,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    // TODO soft delete
    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            // TODO add match record here
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
