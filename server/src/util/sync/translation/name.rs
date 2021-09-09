use super::SyncRecord;

use crate::database::schema::NameRow;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct LegacyNameTable {
    #[serde(rename = "ID")]
    id: String,
    name: String,
    /*
    fax: String,
    phone: String,
    customer: bool,
    bill_address1: String,
    bill_address2: String,
    supplier: bool,
    #[serde(rename = "charge code")]
    charge_code: String,
    margin: i64,
    comment: String,
    #[serde(rename = "currency_ID")]
    currency_id: String,
    country: String,
    freightfac: i64,
    email: String,
    custom1: String,
    code: String,
    last: String,
    first: String,
    title: String,
    female: bool,
    date_of_birth: String,
    overpayment: i64,
    #[serde(rename = "group_ID")]
    group_id: String,
    hold: bool,
    ship_address1: String,
    ship_address2: String,
    url: String,
    barcode: String,
    postal_address1: String,
    postal_address2: String,
    #[serde(rename = "category1_ID")]
    category1_id: String,
    #[serde(rename = "region_ID")]
    region_id: String,
    #[serde(rename = "type")]
    table_type: String,
    price_category: String,
    flag: String,
    manufacturer: bool,
    print_invoice_alphabetical: bool,
    custom2: String,
    custom3: String,
    default_order_days: i64,
    connection_type: i64,
    //PATIENT_PHOTO": "[object Picture]",
    NEXT_OF_KIN_ID: String,
    POBOX: String,
    ZIP: i64,
    middle: String,
    preferred: bool,
    Blood_Group: String,
    marital_status: String,
    Benchmark: bool,
    next_of_kin_relative: String,
    mother_id: String,
    postal_address3: String,
    postal_address4: String,
    bill_address3: String,
    bill_address4: String,
    ship_address3: String,
    ship_address4: String,
    ethnicity_ID: String,
    occupation_ID: String,
    religion_ID: String,
    national_health_number: String,
    Master_RTM_Supplier_Code: i64,
    ordering_method: String,
    donor: bool,
    latitude: i64,
    longitude: i64,
    Master_RTM_Supplier_name: String,
    category2_ID: String,
    category3_ID: String,
    category4_ID: String,
    category5_ID: String,
    category6_ID: String,
    bill_address5: String,
    bill_postal_zip_code: String,
    postal_address5: String,
    postal_zip_code: String,
    ship_address5: String,
    ship_postal_zip_code: String,
    supplying_store_id: String,
    license_number: String,
    license_expiry: String,
    has_current_license: bool,
    //custom_data": null,
    maximum_credit: i64,
    nationality_ID: String,
    created_date: String,
    */
}

impl From<&LegacyNameTable> for NameRow {
    fn from(t: &LegacyNameTable) -> NameRow {
        NameRow {
            id: t.id.to_string(),
            name: t.name.to_string(),
        }
    }
}

impl LegacyNameTable {
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<NameRow>, String> {
        if sync_record.record_type != "name" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyNameTable>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
        Ok(Some(NameRow::from(&data)))
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        database::repository::{repository::get_repositories, NameRepository},
        server::data::RepositoryRegistry,
        util::{
            sync::translation::{import_sync_records, SyncRecord, SyncType},
            test_db,
        },
    };

    #[actix_rt::test]
    async fn test_name_translation() {
        let settings = test_db::get_test_settings("omsupply-database-name-translation");
        test_db::setup(&settings.database).await;
        let repositories = get_repositories(&settings).await;
        let registry = RepositoryRegistry { repositories };
        let name_repo = registry.get::<NameRepository>();

        let record = SyncRecord {
            sync_type: SyncType::Insert,
            record_type: "name".to_string(),
            data: r#"
            {"ID":"CB929EB86530455AB0392277FAC3DBA4","name":"Birch Store","fax":"","phone":"","customer":true,"bill_address1":"234 Evil Street","bill_address2":"Scotland","supplier":false,"charge code":"SNA","margin":0,"comment":"","currency_ID":"8009D512AC0E4FD78625E3C8273B0171","country":"","freightfac":1,"email":"","custom1":"","code":"SNA","last":"","first":"","title":"","female":false,"date_of_birth":"0000-00-00","overpayment":0,"group_ID":"","hold":false,"ship_address1":"","ship_address2":"","url":"","barcode":"*SNA*","postal_address1":"","postal_address2":"","category1_ID":"","region_ID":"","type":"facility","price_category":"A","flag":"","manufacturer":false,"print_invoice_alphabetical":false,"custom2":"","custom3":"","default_order_days":0,"connection_type":0,"PATIENT_PHOTO":"[object Picture]","NEXT_OF_KIN_ID":"","POBOX":"","ZIP":0,"middle":"","preferred":false,"Blood_Group":"","marital_status":"","Benchmark":false,"next_of_kin_relative":"","mother_id":"","postal_address3":"","postal_address4":"","bill_address3":"","bill_address4":"","ship_address3":"","ship_address4":"","ethnicity_ID":"","occupation_ID":"","religion_ID":"","national_health_number":"","Master_RTM_Supplier_Code":0,"ordering_method":"sh","donor":false,"latitude":0,"longitude":0,"Master_RTM_Supplier_name":"","category2_ID":"","category3_ID":"","category4_ID":"","category5_ID":"","category6_ID":"","bill_address5":"","bill_postal_zip_code":"","postal_address5":"","postal_zip_code":"","ship_address5":"","ship_postal_zip_code":"","supplying_store_id":"D77F67339BF8400886D009178F4962E1","license_number":"","license_expiry":"0000-00-00","has_current_license":false,"custom_data":null,"maximum_credit":0,"nationality_ID":"","created_date":"0000-00-00"}
            "#.to_string(),
        };
        let records = vec![record];
        import_sync_records(&registry, &records).await.unwrap();
        let entry = name_repo
            .find_one_by_id("CB929EB86530455AB0392277FAC3DBA4")
            .await
            .unwrap();

        assert_eq!(entry.name, "Birch Store");

        // should be able to upsert
        let record = SyncRecord {
            sync_type: SyncType::Insert,
            record_type: "name".to_string(),
            data: r#"
            {"ID":"CB929EB86530455AB0392277FAC3DBA4","name":"Birch Store 2","fax":"","phone":"","customer":true,"bill_address1":"234 Evil Street","bill_address2":"Scotland","supplier":false,"charge code":"SNA","margin":0,"comment":"","currency_ID":"8009D512AC0E4FD78625E3C8273B0171","country":"","freightfac":1,"email":"","custom1":"","code":"SNA","last":"","first":"","title":"","female":false,"date_of_birth":"0000-00-00","overpayment":0,"group_ID":"","hold":false,"ship_address1":"","ship_address2":"","url":"","barcode":"*SNA*","postal_address1":"","postal_address2":"","category1_ID":"","region_ID":"","type":"facility","price_category":"A","flag":"","manufacturer":false,"print_invoice_alphabetical":false,"custom2":"","custom3":"","default_order_days":0,"connection_type":0,"PATIENT_PHOTO":"[object Picture]","NEXT_OF_KIN_ID":"","POBOX":"","ZIP":0,"middle":"","preferred":false,"Blood_Group":"","marital_status":"","Benchmark":false,"next_of_kin_relative":"","mother_id":"","postal_address3":"","postal_address4":"","bill_address3":"","bill_address4":"","ship_address3":"","ship_address4":"","ethnicity_ID":"","occupation_ID":"","religion_ID":"","national_health_number":"","Master_RTM_Supplier_Code":0,"ordering_method":"sh","donor":false,"latitude":0,"longitude":0,"Master_RTM_Supplier_name":"","category2_ID":"","category3_ID":"","category4_ID":"","category5_ID":"","category6_ID":"","bill_address5":"","bill_postal_zip_code":"","postal_address5":"","postal_zip_code":"","ship_address5":"","ship_postal_zip_code":"","supplying_store_id":"D77F67339BF8400886D009178F4962E1","license_number":"","license_expiry":"0000-00-00","has_current_license":false,"custom_data":null,"maximum_credit":0,"nationality_ID":"","created_date":"0000-00-00"}
            "#.to_string(),
        };
        let records = vec![record];
        import_sync_records(&registry, &records).await.unwrap();
        let entry = name_repo
            .find_one_by_id("CB929EB86530455AB0392277FAC3DBA4")
            .await
            .unwrap();

        assert_eq!(entry.name, "Birch Store 2");
    }
}
