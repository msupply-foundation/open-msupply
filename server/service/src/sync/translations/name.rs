use anyhow::Context;
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, CurrencyRowRepository, GenderType, NameRow, NameRowDelete,
    NameRowRepository, NameRowType, StorageConnection, SyncBufferRow,
};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, empty_str_as_option_string, zero_date_as_option,
};

use serde::{Deserialize, Serialize};

use crate::sync::{translations::currency::CurrencyTranslation, CentralServerConfig};

use super::{
    utils::clear_invalid_fk, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
};

#[derive(Deserialize, Serialize, Debug, PartialEq)]
pub enum LegacyNameRowType {
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

impl LegacyNameRowType {
    fn to_name_type(&self) -> NameRowType {
        match self {
            LegacyNameRowType::Facility => NameRowType::Facility,
            LegacyNameRowType::Patient => NameRowType::Patient,
            LegacyNameRowType::Build => NameRowType::Build,
            LegacyNameRowType::Invad => NameRowType::Invad,
            LegacyNameRowType::Repack => NameRowType::Repack,
            LegacyNameRowType::Store => NameRowType::Store,
            LegacyNameRowType::Others => NameRowType::Others,
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
    pub r#type: LegacyNameRowType,

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

    #[serde(rename = "NEXT_OF_KIN_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub next_of_kin_id: Option<String>,

    #[serde(rename = "next_of_kin_relative")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub next_of_kin_name: Option<String>,

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
    pub gender: Option<GenderType>,

    #[serde(default)]
    #[serde(rename = "om_date_of_death")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_of_death: Option<NaiveDate>,

    #[serde(default)]
    pub custom_data: Option<serde_json::Value>,

    #[serde(default)]
    #[serde(rename = "HSH_code")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub hsh_code: Option<String>,

    #[serde(default)]
    #[serde(rename = "HSH_name")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub hsh_name: Option<String>,

    #[serde(default)]
    pub margin: Option<f64>,

    #[serde(default)]
    #[serde(rename = "freightfac")]
    pub freight_factor: Option<f64>,

    #[serde(default)]
    #[serde(rename = "currency_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub currency_id: Option<String>,
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
        vec![CurrencyTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Name)
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PushToLegacyCentral => {
                let is_name_record = self.change_log_type().as_ref() == Some(&row.table_name);

                if !is_name_record {
                    return false;
                }

                // Check if we're the central server, if we are don't push changes received from remote sites
                // Otherwise we could end up syncing changes back to the site they came from
                if CentralServerConfig::is_central_server() && row.source_site_id.is_some() {
                    log::debug!(
                        "Not pushing name update from remote site back to central for id: {}",
                        row.record_id
                    );
                    return false;
                }

                true
            }
            // We are also pushing to omsupply central so that it's available for
            // cross site patient details sharing, same for names_store_join
            ToSyncRecordTranslationType::PushToOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
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
            next_of_kin_id,
            next_of_kin_name,
            created_date,
            national_health_number,
            is_deceased,
            created_datetime,
            gender,
            date_of_death,
            custom_data,
            hsh_code,
            hsh_name,
            margin,
            freight_factor,
            currency_id,
        } = serde_json::from_str::<LegacyNameRow>(&sync_record.data)?;

        // Custom data for facility or name only (for others, say patient, don't need to have extra overhead or push translation back to json)
        let r#type = legacy_type.to_name_type();
        let custom_data_string = r#type
            .is_facility_or_store()
            .then(|| custom_data.as_ref().map(serde_json::to_string))
            .flatten()
            .transpose()
            .context("Error serialising custom data to string")?;

        // No DB-level FK constraint on supplying_store_id, because the store records also rely on name.
        // We don't want to blank out supplying_store_id if the store record just hasn't been synced yet
        
        let currency_id = clear_invalid_fk(
            connection,
            "name",
            &id,
            "currency_id",
            currency_id,
            |c, id| CurrencyRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

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
            next_of_kin_id,
            next_of_kin_name,
            is_deceased,
            national_health_number,
            gender: gender.or(if legacy_type == LegacyNameRowType::Patient {
                if female {
                    Some(GenderType::Female)
                } else {
                    Some(GenderType::Male)
                }
            } else {
                None
            }),
            created_datetime: created_datetime
                .or(created_date.map(|date| date.and_hms_opt(0, 0, 0).unwrap())),
            date_of_death,
            custom_data_string,
            hsh_code,
            hsh_name,
            margin,
            freight_factor,
            currency_id,
            deleted_datetime: None,
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
            next_of_kin_id,
            next_of_kin_name,
            created_datetime,
            is_deceased,
            date_of_death,
            national_health_number,
            deleted_datetime,
            hsh_code,
            hsh_name,
            margin,
            freight_factor,
            currency_id,
            // See comment in pull translation
            custom_data_string: _,
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
            NameRowType::Patient => LegacyNameRowType::Patient,
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
            female: gender
                .clone()
                .map(|g| g == GenderType::Female)
                .unwrap_or(false),
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
            next_of_kin_id,
            next_of_kin_name,
            created_date: created_datetime.map(|datetime| datetime.date()),
            national_health_number,
            is_deceased,
            created_datetime,
            gender,
            date_of_death,
            hsh_code,
            hsh_name,
            margin,
            freight_factor,
            currency_id,
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
    use repository::{
        mock::{MockData, MockDataInserts},
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::{setup_all, setup_all_with_data},
        CurrencyRow, SyncAction,
    };

    #[actix_rt::test]
    async fn test_name_translation() {
        use crate::sync::test::test_data::name as test_data;
        let translator = NameTranslation {};

        // FK validation: NEW_ZEALAND_DOLLARS currency and store_a need to exist.
        // mock_currencies() doesn't include NEW_ZEALAND_DOLLARS so we add it explicitly.
        let (_, connection, _, _) = setup_all_with_data(
            "test_name_translation",
            MockDataInserts::none().names().stores(),
            MockData {
                currencies: vec![CurrencyRow {
                    id: "NEW_ZEALAND_DOLLARS".to_string(),
                    code: "NZD".to_string(),
                    rate: 1.6,
                    is_home_currency: false,
                    date_updated: None,
                    is_active: true,
                }],
                ..Default::default()
            },
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            // TODO add match record here
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap_or_else(|_| {
                    panic!(
                        "Error translating from upsert sync record {:?}",
                        record.sync_buffer_row.record_id
                    )
                });

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap_or_else(|_| {
                    panic!(
                        "Error translating from delete sync record {:?}",
                        record.sync_buffer_row.record_id
                    )
                });

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_name_clears_invalid_optional_fks_and_writes_system_log() {
        let translator = NameTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_name_clears_invalid_optional_fks_and_writes_system_log",
            MockDataInserts::none(),
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "name".to_string(),
            record_id: "NAME_FK_INVALID".to_string(),
            data: r#"{
                "ID": "NAME_FK_INVALID",
                "name": "Bad FK Name",
                "code": "code",
                "type": "facility",
                "customer": false,
                "supplier": false,
                "supplying_store_id": "does_not_exist_store",
                "first": "",
                "last": "",
                "female": false,
                "date_of_birth": "0000-00-00",
                "phone": "",
                "charge code": "",
                "comment": "",
                "country": "",
                "bill_address1": "",
                "bill_address2": "",
                "email": "",
                "url": "",
                "manufacturer": false,
                "donor": false,
                "hold": false,
                "NEXT_OF_KIN_ID": "",
                "next_of_kin_relative": "",
                "created_date": "0000-00-00",
                "national_health_number": "",
                "isDeceased": false,
                "om_created_datetime": "",
                "om_gender": "",
                "currency_ID": "does_not_exist_currency"
            }"#
            .to_string(),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &sync_record)
            .unwrap();
        let debug = format!("{result:?}");
        // supplying_store_id has no DB-level FK constraint (store depends on name so we can't
        // validate ordering), so it is passed through as-is.
        assert!(
            debug.contains("supplying_store_id: Some(\"does_not_exist_store\")"),
            "{}",
            format!("expected supplying_store_id to pass through unchanged; got:\n{debug}")
        );
        assert!(
            debug.contains("currency_id: None"),
            "{}",
            format!("expected currency_id None; got:\n{debug}")
        );

        let logs = SystemLogRowRepository::new(&connection)
            .find_all()
            .unwrap();
        let fk_errors: Vec<_> = logs
            .iter()
            .filter(|l| l.r#type == SystemLogType::SyncTranslationFkError && l.is_error)
            .collect();
        // Only currency_id is validated (supplying_store_id skipped — no DB FK)
        assert_eq!(fk_errors.len(), 1, "got {fk_errors:?}");
    }
}
