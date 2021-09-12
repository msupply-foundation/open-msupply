use super::SyncRecord;

use crate::database::schema::NameRow;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct LegacyNameRow {
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

impl From<&LegacyNameRow> for NameRow {
    fn from(t: &LegacyNameRow) -> NameRow {
        NameRow {
            id: t.id.to_string(),
            name: t.name.to_string(),
        }
    }
}

impl LegacyNameRow {
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<NameRow>, String> {
        if sync_record.record_type != "name" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyNameRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
        Ok(Some(NameRow::from(&data)))
    }
}

#[cfg(test)]
mod tests {
    use crate::util::sync::translation::{
        name::LegacyNameRow,
        test_data::{name::get_test_name_records, TestSyncDataRecord},
    };

    #[test]
    fn test_name_translation() {
        for record in get_test_name_records() {
            match record.translated_record {
                TestSyncDataRecord::Name(translated_record) => {
                    assert_eq!(
                        LegacyNameRow::try_translate(&record.sync_record).unwrap(),
                        translated_record,
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
