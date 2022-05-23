use repository::{
    ChangelogRow, ChangelogTableName, Gender, NameRow, NameRowRepository, RemoteSyncBufferRow,
    StorageConnection,
};

use crate::sync::translation_central::{translate_name, LegacyNameRow, LegacyNameType};

use super::{
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{PushUpsertRecord, RemotePushUpsertTranslation},
    TRANSLATION_RECORD_NAME,
};

pub struct NameTranslation {}
impl RemotePullTranslation for NameTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<super::pull::IntegrationRecord>, anyhow::Error> {
        if sync_record.table_name != TRANSLATION_RECORD_NAME {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyNameRow>(&sync_record.data)?;
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Name(translate_name(data)),
        )))
    }
}

impl RemotePushUpsertTranslation for NameTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        if changelog.table_name != ChangelogTableName::Name {
            return Ok(None);
        }
        let table_name = TRANSLATION_RECORD_NAME;

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
        } = NameRowRepository::new(connection)
            .find_one_by_id(&changelog.row_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Name row ({}) not found",
                changelog.row_id
            )))?;

        let legacy_row = LegacyNameRow {
            ID: id.clone(),
            name,
            code,
            r#type: LegacyNameType::from_name_type(&r#type),
            customer: is_customer,
            supplier: is_supplier,
            supplying_store_id: supplying_store_id.clone(),
            first_name,
            last_name,
            female: gender
                .as_ref()
                .map(|g| g == &Gender::Female)
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
            created_date: created_datetime.map(|dt| dt.date()),
            //om_created_datetime: created_datetime,
            //om_gender: gender,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: supplying_store_id,
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)?,
        }]))
    }
}
