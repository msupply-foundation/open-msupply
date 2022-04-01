use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use repository::{schema::NameRow, Name};

use graphql_core::{loader::StoreByIdLoader, simple_generic_errors::NodeError, ContextExt};
use serde_json::json;

use super::StoreNode;

#[Object]
impl NameNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn is_customer(&self) -> bool {
        self.name.is_customer()
    }

    pub async fn is_supplier(&self) -> bool {
        self.name.is_supplier()
    }

    pub async fn is_visible(&self) -> bool {
        self.name.is_visible()
    }

    pub async fn is_system_name(&self) -> bool {
        self.name.is_system_name()
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let store_id = match self.name.store_id() {
            Some(store_id) => store_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        Ok(loader
            .load_one(store_id.to_string())
            .await?
            .map(StoreNode::from_domain))
    }

    // Mock

    pub async fn phone(&self) -> String {
        self.legacy_string("phone")
    }

    pub async fn charge_code(&self) -> String {
        self.legacy_string("charge code")
    }

    pub async fn comment(&self) -> String {
        self.legacy_string("comment")
    }

    pub async fn country(&self) -> String {
        self.legacy_string("country")
    }

    pub async fn address(&self) -> &str {
        ""
    }

    pub async fn email(&self) -> String {
        self.legacy_string("email")
    }

    pub async fn website(&self) -> String {
        self.legacy_string("url")
    }

    pub async fn is_manufacturer(&self) -> bool {
        self.legacy_bool("manufacturer")
    }

    pub async fn is_donor(&self) -> bool {
        self.legacy_bool("donor")
    }

    pub async fn created_date(&self) -> Option<NaiveDate> {
        Some(NaiveDate::from_ymd(2010, 02, 28))
    }

    pub async fn is_on_hold(&self) -> bool {
        self.legacy_bool("hold")
    }
}

#[derive(Union)]
pub enum NameResponse {
    Error(NodeError),
    Response(NameNode),
}

#[derive(PartialEq, Debug)]
pub struct NameNode {
    pub name: Name,
}

impl NameNode {
    pub fn from_domain(name: Name) -> NameNode {
        NameNode { name }
    }

    pub fn row(&self) -> &NameRow {
        &self.name.name_row
    }

    pub fn legacy_string(&self, key: &str) -> String {
        let json_value: serde_json::Value = match serde_json::from_str(&self.row().legacy_record) {
            Ok(value) => value,
            Err(_) => return "".to_owned(),
        };

        json_value
            .get(key)
            .unwrap_or(&json!(""))
            .as_str()
            .unwrap()
            .to_string()
    }

    pub fn legacy_bool(&self, key: &str) -> bool {
        let json_value: serde_json::Value = match serde_json::from_str(&self.row().legacy_record) {
            Ok(value) => value,
            Err(_) => return false,
        };

        json_value
            .get(key)
            .unwrap_or(&json!(false))
            .as_bool()
            .unwrap()
    }
}

#[cfg(test)]
mod test {
    use async_graphql::{EmptyMutation, Object};
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use util::inline_init;

    use super::*;

    #[actix_rt::test]
    async fn graphq_test_name_node_details() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphl_test(
            TestQuery,
            EmptyMutation,
            "graphq_test_name_node_details",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> NameNode {
                NameNode {
                    name: Name {
                        name_row: inline_init(|r: &mut NameRow| {
                            r.legacy_record = r#"{
                                "ID": "EBC665F368214F708B2CD908FBE85432",
                                "name": "test",
                                "fax": "",
                                "phone": "0218738201",
                                "customer": true,
                                "bill_address1": "",
                                "bill_address2": "",
                                "supplier": true,
                                "charge code": "test",
                                "margin": 0,
                                "comment": "name comment",
                                "currency_ID": "51FE3CF614A542F79DE8BEA99503610E",
                                "country": "name country",
                                "freightfac": 1,
                                "email": "name email",
                                "custom1": "",
                                "code": "test",
                                "last": "",
                                "first": "",
                                "title": "",
                                "female": false,
                                "date_of_birth": "0000-00-00",
                                "overpayment": 0,
                                "group_ID": "",
                                "hold": true,
                                "ship_address1": "",
                                "ship_address2": "",
                                "url": "name website",
                                "barcode": "*test*",
                                "postal_address1": "",
                                "postal_address2": "",
                                "category1_ID": "",
                                "region_ID": "",
                                "type": "store",
                                "price_category": "A",
                                "flag": "",
                                "manufacturer": true,
                                "print_invoice_alphabetical": false,
                                "custom2": "",
                                "custom3": "",
                                "default_order_days": 0,
                                "connection_type": 0,
                                "PATIENT_PHOTO": "[object Picture]",
                                "NEXT_OF_KIN_ID": "",
                                "POBOX": "",
                                "ZIP": 0,
                                "middle": "",
                                "preferred": false,
                                "Blood_Group": "",
                                "marital_status": "",
                                "Benchmark": false,
                                "next_of_kin_relative": "",
                                "mother_id": "",
                                "postal_address3": "",
                                "postal_address4": "",
                                "bill_address3": "",
                                "bill_address4": "",
                                "ship_address3": "",
                                "ship_address4": "",
                                "ethnicity_ID": "",
                                "occupation_ID": "",
                                "religion_ID": "",
                                "national_health_number": "",
                                "Master_RTM_Supplier_Code": 0,
                                "ordering_method": "sh",
                                "donor": false,
                                "latitude": 0,
                                "longitude": 0,
                                "Master_RTM_Supplier_name": "",
                                "category2_ID": "",
                                "category3_ID": "",
                                "category4_ID": "",
                                "category5_ID": "",
                                "category6_ID": "",
                                "bill_address5": "",
                                "bill_postal_zip_code": "",
                                "postal_address5": "",
                                "postal_zip_code": "",
                                "ship_address5": "",
                                "ship_postal_zip_code": "",
                                "supplying_store_id": "0AD994631A1D4BFAB42921DA60BD6474",
                                "license_number": "",
                                "license_expiry": "0000-00-00",
                                "has_current_license": false,
                                "custom_data": null,
                                "maximum_credit": 0,
                                "nationality_ID": "",
                                "created_date": "0000-00-00",
                                "integration_ID": ""
                            }"#
                            .to_string();
                        }),
                        name_store_join_row: None,
                        store_row: None,
                    },
                }
            }
        }

        let expected = json!({
            "testQuery": {
                "__typename": "NameNode",
                "phone": "0218738201",
                "chargeCode": "test",
                "comment": "name comment",
                "country": "name country",
                "email": "name email",
                "website": "name website",
                "isManufacturer": true,
                "isDonor": false,
                "isOnHold": true,
                // todo
                // created date
                // address
            }
        }
        );

        let query = r#"
        query {
            testQuery {
                __typename
               phone
               chargeCode
               comment
               country
               address
               email
               website
               isManufacturer
               isDonor
               createdDate
               isOnHold
            }
        }
        "#;
        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
