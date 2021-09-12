use super::SyncRecord;

use crate::database::schema::StoreRow;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct LegacyStoreRow {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
    /*
    name: String,
    code: String,
    mwks_export_mode: String,
    IS_HIS: bool,
    sort_issues_by_status_spare: bool,
    disabled: bool,
    responsible_user_ID: String,
    organisation_name: String,
    address_1: String,
    address_2: String,
    //logo": "[object Picture]",
    sync_id_remote_site: u64,
    address_3: String,
    address_4: String,
    address_5: String,
    postal_zip_code: String,
    store_mode: String,
    phone: String,
    tags: String,
    spare_user_1: String,
    spare_user_2: String,
    spare_user_3: String,
    spare_user_4: String,
    spare_user_5: String,
    spare_user_6: String,
    spare_user_7: String,
    spare_user_8: String,
    spare_user_9: String,
    spare_user_10: String,
    spare_user_11: String,
    spare_user_12: String,
    spare_user_13: String,
    spare_user_14: String,
    spare_user_15: String,
    spare_user_16: String,
    //custom_data: null,
    created_date: String,
    */
}

impl LegacyStoreRow {
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<StoreRow>, String> {
        if sync_record.record_type != "store" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyStoreRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
        Ok(Some(StoreRow {
            id: data.id.to_string(),
            name_id: data.name_id.to_string(),
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        database::{
            repository::{
                repository::get_repositories, NameRepository, RepositoryError, StoreRepository,
            },
            schema::NameRow,
        },
        server::data::RepositoryRegistry,
        util::{
            sync::translation::{import_sync_records, SyncRecord, SyncType},
            test_db,
        },
    };

    #[actix_rt::test]
    async fn test_store_translation() {
        let settings = test_db::get_test_settings("omsupply-database-store-translation");
        test_db::setup(&settings.database).await;
        let repositories = get_repositories(&settings).await;
        let registry = RepositoryRegistry { repositories };
        let store_repo = registry.get::<StoreRepository>();

        // ignore store with empty name_ID
        let record = SyncRecord {
            sync_type: SyncType::Insert,
            record_type: "store".to_string(),
            data: r#"
            {"ID":"4BCCA3E6AB9847E3B992B6DDDC839B83","name":"Supervisor- All stores","code":"SM","name_ID":"","mwks_export_mode":"","IS_HIS":false,"sort_issues_by_status_spare":false,"disabled":false,"responsible_user_ID":"","organisation_name":"","address_1":"","address_2":"","logo":"[object Picture]","sync_id_remote_site":1,"address_3":"","address_4":"","address_5":"","postal_zip_code":"","store_mode":"supervisor","phone":"","tags":"","spare_user_1":"","spare_user_2":"","spare_user_3":"","spare_user_4":"","spare_user_5":"","spare_user_6":"","spare_user_7":"","spare_user_8":"","spare_user_9":"","spare_user_10":"","spare_user_11":"","spare_user_12":"","spare_user_13":"","spare_user_14":"","spare_user_15":"","spare_user_16":"","custom_data":null,"created_date":"0000-00-00"}
            "#.to_string(),
        };
        let records = vec![record];
        import_sync_records(&registry, &records).await.unwrap();
        let entry = store_repo
            .find_one_by_id("4BCCA3E6AB9847E3B992B6DDDC839B83")
            .await;
        assert_eq!(entry.err().unwrap(), RepositoryError::NotFound);

        // store with name_ID
        // add dummy name row:
        let name_repo = registry.get::<NameRepository>();
        name_repo
            .insert_one(&NameRow {
                id: "9A3F71AA4C6D48649ADBC4B2966C5B9D".to_string(),
                name: "storename".to_string(),
            })
            .await
            .unwrap();
        let record = SyncRecord {
          sync_type: SyncType::Insert,
          record_type: "store".to_string(),
          data: r#"
          {"ID":"9EDD3F83C3D64C22A3CC9C98CF4967C4","name":"Drug Registration","code":"DRG","name_ID":"9A3F71AA4C6D48649ADBC4B2966C5B9D","mwks_export_mode":"","IS_HIS":false,"sort_issues_by_status_spare":false,"disabled":false,"responsible_user_ID":"","organisation_name":"","address_1":"","address_2":"","logo":"[object Picture]","sync_id_remote_site":1,"address_3":"","address_4":"","address_5":"","postal_zip_code":"","store_mode":"drug_registration","phone":"","tags":"","spare_user_1":"","spare_user_2":"","spare_user_3":"","spare_user_4":"","spare_user_5":"","spare_user_6":"","spare_user_7":"","spare_user_8":"","spare_user_9":"","spare_user_10":"","spare_user_11":"","spare_user_12":"","spare_user_13":"","spare_user_14":"","spare_user_15":"","spare_user_16":"","custom_data":null,"created_date":"0000-00-00"}
          "#.to_string(),
        };
        let records = vec![record];
        import_sync_records(&registry, &records).await.unwrap();
        let entry = store_repo
            .find_one_by_id("9EDD3F83C3D64C22A3CC9C98CF4967C4")
            .await
            .unwrap();
        assert_eq!(entry.id, "9EDD3F83C3D64C22A3CC9C98CF4967C4");
    }
}
