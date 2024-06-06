use super::{ItemStatsNode, StockLineConnector};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::{
    loader::{
        ItemStatsLoaderInput, ItemsStatsForItemLoader, ItemsStockOnHandLoader,
        ItemsStockOnHandLoaderInput, StockLineByItemAndStoreIdLoader,
        StockLineByItemAndStoreIdLoaderInput,
    },
    simple_generic_errors::InternalError,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{Item, ItemRow, ItemType};
use serde_json::json;
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct ItemNode {
    item: Item,
}

#[derive(SimpleObject)]
pub struct ItemConnector {
    total_count: u32,
    nodes: Vec<ItemNode>,
}

#[Object]
impl ItemNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn unit_name(&self) -> Option<&str> {
        self.item.unit_name()
    }

    pub async fn r#type(&self) -> ItemNodeType {
        ItemNodeType::from_domain(&self.row().r#type)
    }

    pub async fn stats(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Defaults to 3 months")] amc_lookback_months: Option<u32>,
    ) -> Result<ItemStatsNode> {
        let loader = ctx.get_loader::<DataLoader<ItemsStatsForItemLoader>>();
        let result = loader
            .load_one(ItemStatsLoaderInput::new(
                &store_id,
                &self.row().id,
                amc_lookback_months,
            ))
            .await?
            .ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find item stats for item {} and store {}",
                    &self.row().id,
                    store_id
                ))
                .extend(),
            )?;

        Ok(ItemStatsNode::from_domain(result))
    }

    async fn available_batches(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<StockLineConnector> {
        let loader = ctx.get_loader::<DataLoader<StockLineByItemAndStoreIdLoader>>();
        let result_option = loader
            .load_one(StockLineByItemAndStoreIdLoaderInput::new(
                &store_id,
                &self.row().id,
            ))
            .await?;

        Ok(StockLineConnector::from_vec(
            result_option.unwrap_or(vec![]),
        ))
    }

    pub async fn available_stock_on_hand(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<u32> {
        let loader = ctx.get_loader::<DataLoader<ItemsStockOnHandLoader>>();
        let result = loader
            .load_one(ItemsStockOnHandLoaderInput::new(&store_id, &self.row().id))
            .await?
            .ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot calculate stock on hand for item {} at store {}",
                    &self.row().id,
                    store_id
                ))
                .extend(),
            )?;

        Ok(result)
    }

    // Mock

    pub async fn msupply_universal_code(&self) -> String {
        self.legacy_string("universalcodes_code")
    }

    pub async fn msupply_universal_name(&self) -> String {
        self.legacy_string("universalcodes_name")
    }

    pub async fn doses(&self) -> i64 {
        self.legacy_i64("doses")
    }

    pub async fn is_vaccine(&self) -> bool {
        self.legacy_bool("is_vaccine")
    }

    pub async fn default_pack_size(&self) -> f64 {
        self.row().default_pack_size
    }

    pub async fn outer_pack_size(&self) -> i64 {
        self.legacy_i64("outer_pack_size")
    }

    pub async fn volume_per_outer_pack(&self) -> f64 {
        self.legacy_f64("volume_per_outer_pack")
    }

    pub async fn volume_per_pack(&self) -> f64 {
        self.legacy_f64("volume_per_pack")
    }

    pub async fn margin(&self) -> f64 {
        self.legacy_f64("margin")
    }

    pub async fn weight(&self) -> f64 {
        self.legacy_f64("weight")
    }

    pub async fn strength(&self) -> String {
        self.legacy_string("strength")
    }

    pub async fn atc_category(&self) -> String {
        self.legacy_string("atc_category")
    }

    pub async fn ddd(&self) -> String {
        self.legacy_string("ddd_value")
    }
}

#[derive(Union)]
pub enum ItemResponseError {
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct ItemError {
    pub error: ItemResponseError,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ItemNodeType {
    Service,
    Stock,
    NonStock,
}

impl ItemNodeType {
    pub fn from_domain(from: &ItemType) -> ItemNodeType {
        match from {
            ItemType::Stock => ItemNodeType::Stock,
            ItemType::Service => ItemNodeType::Service,
            ItemType::NonStock => ItemNodeType::NonStock,
        }
    }

    pub fn to_domain(self) -> ItemType {
        match self {
            ItemNodeType::Stock => ItemType::Stock,
            ItemNodeType::Service => ItemType::Service,
            ItemNodeType::NonStock => ItemType::NonStock,
        }
    }
}

#[derive(Union)]
pub enum ItemResponse {
    Error(ItemError),
    Response(ItemNode),
}

impl ItemNode {
    pub fn from_domain(item: Item) -> ItemNode {
        ItemNode { item }
    }

    pub fn row(&self) -> &ItemRow {
        &self.item.item_row
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

    pub fn legacy_i64(&self, key: &str) -> i64 {
        let json_value: serde_json::Value = match serde_json::from_str(&self.row().legacy_record) {
            Ok(value) => value,
            Err(_) => return 0,
        };

        json_value.get(key).unwrap_or(&json!(0)).as_i64().unwrap()
    }

    pub fn legacy_f64(&self, key: &str) -> f64 {
        let json_value: serde_json::Value = match serde_json::from_str(&self.row().legacy_record) {
            Ok(value) => value,
            Err(_) => return 0.0,
        };

        json_value.get(key).unwrap_or(&json!(0.0)).as_f64().unwrap()
    }
}

impl ItemConnector {
    pub fn from_domain(items: ListResult<Item>) -> ItemConnector {
        ItemConnector {
            total_count: items.count,
            nodes: items.rows.into_iter().map(ItemNode::from_domain).collect(),
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::Object;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use util::inline_init;

    use super::*;

    #[actix_rt::test]
    async fn graphq_test_item_node_details() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphq_test_item_node_details",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> ItemNode {
                ItemNode {
                    item: inline_init(|r: &mut Item| {
                        r.item_row = inline_init(|r: &mut ItemRow| {
                            r.legacy_record = r#"{
                                "ID": "AA460A207402434A89B1F6EEAC08DA43",
                                "item_name": "test_item",
                                "start_of_year_date": "0000-00-00",
                                "manufacture_method": "",
                                "default_pack_size": 0,
                                "dose_picture": "[object Picture]",
                                "atc_category": "",
                                "medication_purpose": "",
                                "instructions": "",
                                "user_field_7": false,
                                "flags": "",
                                "ddd_value": "0.1",
                                "code": "test_item",
                                "other_names": "",
                                "type_of": "general",
                                "price_editable": false,
                                "margin": 0.3,
                                "barcode_spare": "",
                                "spare_ignore_for_orders": false,
                                "sms_pack_size": 0,
                                "expiry_date_mandatory": false,
                                "volume_per_pack": 0.5,
                                "department_ID": "",
                                "weight": 10.5,
                                "essential_drug_list": false,
                                "catalogue_code": "",
                                "indic_price": 0,
                                "user_field_1": "",
                                "spare_hold_for_issue": false,
                                "builds_only": false,
                                "reference_bom_quantity": 0,
                                "use_bill_of_materials": false,
                                "description": "",
                                "spare_hold_for_receive": false,
                                "Message": "",
                                "interaction_group_ID": "",
                                "spare_pack_to_one_on_receive": false,
                                "cross_ref_item_ID": "",
                                "strength": "1.5mg",
                                "user_field_4": false,
                                "user_field_6": "",
                                "spare_internal_analysis": 0,
                                "user_field_2": "",
                                "user_field_3": "",
                                "ddd factor": 0,
                                "account_stock_ID": "CB81F6CD62C1476F9411362053D49E84",
                                "account_purchases_ID": "0BE743A3727E49118BEB01CC26D129AD",
                                "account_income_ID": "522C7F3C06CD444CB1FB360D19E337D0",
                                "unit_ID": "",
                                "outer_pack_size": 10,
                                "category_ID": "",
                                "ABC_category": "",
                                "warning_quantity": 0,
                                "user_field_5": 0,
                                "print_units_in_dis_labels": false,
                                "volume_per_outer_pack": 11.2,
                                "normal_stock": false,
                                "critical_stock": false,
                                "spare_non_stock": false,
                                "non_stock_name_ID": "",
                                "is_sync": false,
                                "sms_code": "",
                                "category2_ID": "",
                                "category3_ID": "",
                                "buy_price": 0,
                                "VEN_category": "",
                                "universalcodes_code": "universal code",
                                "universalcodes_name": "universal name",
                                "kit_data": null,
                                "custom_data": null,
                                "doses": 11,
                                "is_vaccine": true,
                                "restricted_location_type_ID": ""
                            }"#
                            .to_string();
                        });
                    }),
                }
            }
        }

        let expected = json!({
            "testQuery": {
              "__typename": "ItemNode",
              "atcCategory": "",
              "ddd": "0.1",
              "doses": 11,
              "isVaccine": true,
              "margin": 0.3,
              "msupplyUniversalCode": "universal code",
              "msupplyUniversalName": "universal name",
              "outerPackSize": 10,
              "strength": "1.5mg",
              "volumePerOuterPack": 11.2,
              "volumePerPack": 0.5,
              "weight": 10.5
            }
          }
        );

        let query = r#"
        query {
            testQuery {
                __typename
               msupplyUniversalCode
               msupplyUniversalName
               doses
               isVaccine
               outerPackSize
               volumePerPack
               volumePerOuterPack
               margin
               weight
               strength
               atcCategory
               ddd
            }
        }
        "#;
        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
