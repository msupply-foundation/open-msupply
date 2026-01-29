use chrono::NaiveDate;
use repository::{
    name_insurance_join_row::{
        InsurancePolicyType, NameInsuranceJoinRow, NameInsuranceJoinRowRepository,
    },
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{empty_str_as_option_string, object_fields_as_option};

use crate::sync::translations::{
    insurance_provider::InsuranceProviderTranslator, name::NameTranslation,
};

use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyInsurancePolicyType {
    #[serde(rename = "personal")]
    Personal,
    #[serde(rename = "business")]
    Business,
}

#[derive(Deserialize, Serialize)]
pub struct LegacyNameInsuranceJoinRowOmsFields {
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub name_of_insured: Option<String>,
}

impl LegacyInsurancePolicyType {
    fn to_domain(&self) -> InsurancePolicyType {
        match self {
            LegacyInsurancePolicyType::Personal => InsurancePolicyType::Personal,
            LegacyInsurancePolicyType::Business => InsurancePolicyType::Business,
        }
    }
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
pub struct LegacyNameInsuranceJoinRow {
    pub ID: String,
    pub nameID: String,
    pub insuranceProviderID: String,
    pub discountRate: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub enteredByID: Option<String>,
    pub expiryDate: NaiveDate,
    pub isActive: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub policyNumberFamily: Option<String>,
    pub policyNumberFull: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub policyNumberPerson: Option<String>,
    #[serde(rename = "type")]
    pub policyType: LegacyInsurancePolicyType,
    #[serde(default)]
    #[serde(deserialize_with = "object_fields_as_option")]
    pub oms_fields: Option<LegacyNameInsuranceJoinRowOmsFields>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameInsuranceJoinTranslation)
}

pub(super) struct NameInsuranceJoinTranslation;
impl SyncTranslation for NameInsuranceJoinTranslation {
    fn table_name(&self) -> &str {
        "nameInsuranceJoin"
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::NameInsuranceJoin)
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            NameTranslation.table_name(),
            InsuranceProviderTranslator.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyNameInsuranceJoinRow {
            ID,
            nameID,
            insuranceProviderID,
            discountRate,
            enteredByID,
            expiryDate,
            isActive,
            policyNumberFamily,
            policyNumberFull,
            policyNumberPerson,
            policyType,
            oms_fields,
        } = serde_json::from_str::<LegacyNameInsuranceJoinRow>(&sync_record.data)?;

        let result = NameInsuranceJoinRow {
            id: ID,
            name_id: nameID,
            insurance_provider_id: insuranceProviderID,
            policy_number_person: policyNumberPerson,
            policy_number_family: policyNumberFamily,
            policy_number: policyNumberFull,
            policy_type: policyType.to_domain(),
            discount_percentage: discountRate,
            expiry_date: expiryDate,
            is_active: isActive,
            entered_by_id: enteredByID,
            name_of_insured: oms_fields.and_then(|f| f.name_of_insured),
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PushToLegacyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &repository::ChangelogRow,
    ) -> Result<super::PushTranslateResult, anyhow::Error> {
        let NameInsuranceJoinRow {
            id,
            name_id: name_link_id,
            insurance_provider_id,
            policy_number_person,
            policy_number_family,
            policy_number,
            policy_type,
            discount_percentage,
            expiry_date,
            is_active,
            entered_by_id,
            name_of_insured,
        } = NameInsuranceJoinRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| {
                anyhow::Error::msg(format!(
                    "NameInsuranceJoin row ({}) not found",
                    changelog.record_id
                ))
            })?;

        let oms_fields = if name_of_insured.is_some() {
            Some(LegacyNameInsuranceJoinRowOmsFields { name_of_insured })
        } else {
            None
        };

        let legacy_row = LegacyNameInsuranceJoinRow {
            ID: id,
            nameID: name_link_id,
            insuranceProviderID: insurance_provider_id,
            discountRate: discount_percentage,
            enteredByID: entered_by_id,
            expiryDate: expiry_date,
            isActive: is_active,
            policyNumberFamily: policy_number_family,
            policyNumberFull: policy_number,
            policyNumberPerson: policy_number_person,
            policyType: match policy_type {
                InsurancePolicyType::Personal => LegacyInsurancePolicyType::Personal,
                InsurancePolicyType::Business => LegacyInsurancePolicyType::Business,
            },
            oms_fields,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_insurance_join_translation() {
        use crate::sync::test::test_data::name_insurance_join as test_data;
        let translator = NameInsuranceJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_name_insurance_join_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
