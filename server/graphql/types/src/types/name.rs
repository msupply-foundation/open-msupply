use super::{patient::GenderTypeNode, StoreNode};
use crate::types::CurrencyNode;
use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, NaiveDate, Utc};
use graphql_core::{
    loader::CurrencyByIdLoader, simple_generic_errors::NodeError,
    standard_graphql_error::StandardGraphqlError, ContextExt,
};
use repository::{Name, NameRow, NameRowType, NameType, Store, StoreRow};
use serde::Serialize;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
#[graphql(remote = "repository::db_diesel::name::NameType")]
pub enum NameNodeType {
    Facility,
    Invad,
    Repack,
    Store,
}

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

    pub async fn r#type(&self) -> NameNodeType {
        NameNodeType::from(<NameRowType as Into<NameType>>::into(
            self.row().r#type.clone(),
        ))
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

    pub async fn store(&self) -> Option<StoreNode> {
        self.store_row().as_ref().map(|store_row| {
            StoreNode::from_domain(Store {
                store_row: store_row.clone(),
                name_row: self.row().clone(),
            })
        })
    }

    pub async fn first_name(&self) -> &Option<String> {
        &self.row().first_name
    }

    pub async fn last_name(&self) -> &Option<String> {
        &self.row().last_name
    }

    pub async fn gender(&self) -> Option<GenderTypeNode> {
        Some(GenderTypeNode::from(
            self.row().gender.clone().unwrap_or_default(),
        ))
    }

    pub async fn phone(&self) -> &Option<String> {
        &self.row().phone
    }

    pub async fn charge_code(&self) -> &Option<String> {
        &self.row().charge_code
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn country(&self) -> &Option<String> {
        &self.row().country
    }

    pub async fn address1(&self) -> &Option<String> {
        &self.row().address1
    }

    pub async fn address2(&self) -> &Option<String> {
        &self.row().address2
    }

    pub async fn email(&self) -> &Option<String> {
        &self.row().email
    }

    pub async fn website(&self) -> &Option<String> {
        &self.row().website
    }

    pub async fn is_manufacturer(&self) -> bool {
        self.row().is_manufacturer
    }

    pub async fn is_donor(&self) -> bool {
        self.row().is_donor
    }

    pub async fn is_on_hold(&self) -> bool {
        self.row().on_hold
    }

    pub async fn created_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .created_datetime
            .map(|datetime| DateTime::<Utc>::from_naive_utc_and_offset(datetime, Utc))
    }

    pub async fn date_of_birth(&self) -> Option<NaiveDate> {
        self.row().date_of_birth
    }

    pub async fn custom_data(&self) -> Result<Option<serde_json::Value>> {
        self.name
            .custom_data()
            .map_err(|err| StandardGraphqlError::from_error(&err))
    }

    /// Returns a JSON string of the name properties e.g {"property_key": "value"}
    pub async fn properties(&self) -> String {
        match &self.name.properties {
            Some(properties) => properties.to_owned(),
            None => "{}".to_string(), // Empty JSON object
        }
    }

    pub async fn hsh_code(&self) -> &Option<String> {
        &self.row().hsh_code
    }

    pub async fn hsh_name(&self) -> &Option<String> {
        &self.row().hsh_name
    }

    pub async fn margin(&self) -> &Option<f64> {
        &self.row().margin
    }

    pub async fn freight_factor(&self) -> &Option<f64> {
        &self.row().freight_factor
    }

    pub async fn currency(&self, ctx: &Context<'_>) -> Result<Option<CurrencyNode>> {
        let currency_id = match &self.row().currency_id {
            Some(currency_id) => currency_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<CurrencyByIdLoader>>();

        let result = loader
            .load_one(currency_id.clone())
            .await?
            .map(CurrencyNode::from_domain);

        Ok(result)
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

    pub fn store_row(&self) -> &Option<StoreRow> {
        &self.name.store_row
    }

    pub fn row(&self) -> &NameRow {
        &self.name.name_row
    }
}

#[cfg(test)]
mod test {
    use async_graphql::Object;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use repository::{GenderType as GenderRepo, NameRowType};
    use serde_json::json;

    use super::*;

    #[actix_rt::test]
    async fn graphql_test_name_node_details() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphql_test_name_node_details",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> NameNode {
                NameNode {
                    name: Name {
                        name_row: NameRow {
                            r#type: NameRowType::Store,
                            code: "some code".to_string(),
                            first_name: Some("first_name".to_string()),
                            last_name: Some("last_name".to_string()),
                            gender: Some(GenderRepo::Female),
                            phone: Some("0218738201".to_string()),
                            charge_code: Some("test".to_string()),
                            comment: Some("name comment".to_string()),
                            country: Some("name country".to_string()),
                            email: Some("name email".to_string()),
                            website: Some("name website".to_string()),
                            is_manufacturer: true,
                            is_donor: false,
                            on_hold: true,
                            address1: Some("address1".to_string()),
                            address2: Some("address2".to_string()),
                            created_datetime: Some(
                                NaiveDate::from_ymd_opt(2022, 5, 18)
                                    .unwrap()
                                    .and_hms_opt(12, 7, 12)
                                    .unwrap(),
                            ),
                            date_of_birth: Some(NaiveDate::from_ymd_opt(1995, 5, 15).unwrap()),
                            custom_data_string: Some(r#"{"check": "check"}"#.to_string()),
                            ..Default::default()
                        },
                        name_store_join_row: None,
                        store_row: None,
                        properties: None,
                    },
                }
            }
        }

        let expected = json!({
            "testQuery": {
                "__typename": "NameNode",
                "type": "STORE",
                "code": "some code",
                "firstName": "first_name",
                "lastName": "last_name",
                "gender": "FEMALE",
                "phone": "0218738201",
                "chargeCode": "test",
                "comment": "name comment",
                "country": "name country",
                "email": "name email",
                "website": "name website",
                "isManufacturer": true,
                "isDonor": false,
                "isOnHold": true,
                "address1": "address1",
                "address2": "address2",
                "createdDatetime": "2022-05-18T12:07:12+00:00",
                "dateOfBirth": "1995-05-15",
                "customData": {
                    "check": "check"
                }
            }
        }
        );

        let query = r#"
        query {
            testQuery {
               __typename
               type
               code
               firstName
               lastName
               gender
               phone
               chargeCode
               comment
               country
               address1
               address2
               email
               website
               isManufacturer
               isDonor
               createdDatetime
               isOnHold
               dateOfBirth
               customData
            }
        }
        "#;
        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
