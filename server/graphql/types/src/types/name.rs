use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use dataloader::DataLoader;
use repository::{Gender, Name, NameRow, NameType};

use graphql_core::{
    loader::StoreByIdLoader, simple_generic_errors::NodeError,
    standard_graphql_error::StandardGraphqlError, ContextExt,
};
use serde::Serialize;

use super::StoreNode;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum GenderInput {
    Female,
    Male,
    TransgenderMale,
    TransgenderMaleHormone,
    TransgenderMaleSurgical,
    TransgenderFemale,
    TransgenderFemaleHormone,
    TransgenderFemaleSurgical,
    Unknown,
    NonBinary,
}

impl GenderInput {
    pub fn to_domain(self) -> Gender {
        match self {
            GenderInput::Female => Gender::Female,
            GenderInput::Male => Gender::Male,
            GenderInput::TransgenderMale => Gender::TransgenderMale,
            GenderInput::TransgenderMaleHormone => Gender::TransgenderMaleHormone,
            GenderInput::TransgenderMaleSurgical => Gender::TransgenderMaleSurgical,
            GenderInput::TransgenderFemale => Gender::TransgenderFemale,
            GenderInput::TransgenderFemaleHormone => Gender::TransgenderFemaleHormone,
            GenderInput::TransgenderFemaleSurgical => Gender::TransgenderFemaleSurgical,
            GenderInput::Unknown => Gender::Unknown,
            GenderInput::NonBinary => Gender::NonBinary,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct EqualFilterGenderInput {
    pub equal_to: Option<GenderInput>,
    pub equal_any: Option<Vec<GenderInput>>,
    pub not_equal_to: Option<GenderInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum NameNodeType {
    Facility,
    Patient,
    Build,
    Invad,
    Repack,
    Store,
    Others,
}
impl NameNodeType {
    pub fn from_domain(name_type: &NameType) -> Self {
        match name_type {
            NameType::Facility => NameNodeType::Facility,
            NameType::Patient => NameNodeType::Patient,
            NameType::Build => NameNodeType::Build,
            NameType::Invad => NameNodeType::Invad,
            NameType::Repack => NameNodeType::Repack,
            NameType::Store => NameNodeType::Store,
            NameType::Others => NameNodeType::Others,
        }
    }
    pub fn to_domain(self) -> NameType {
        match self {
            NameNodeType::Facility => NameType::Facility,
            NameNodeType::Patient => NameType::Patient,
            NameNodeType::Build => NameType::Build,
            NameNodeType::Invad => NameType::Invad,
            NameNodeType::Repack => NameType::Repack,
            NameNodeType::Store => NameType::Store,
            NameNodeType::Others => NameType::Others,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum GenderType {
    Female,
    Male,
    Transgender,
    TransgenderMale,
    TransgenderMaleHormone,
    TransgenderMaleSurgical,
    TransgenderFemale,
    TransgenderFemaleHormone,
    TransgenderFemaleSurgical,
    Unknown,
    NonBinary,
}
impl GenderType {
    pub fn from_domain(gender: &Gender) -> Self {
        match gender {
            Gender::Female => GenderType::Female,
            Gender::Male => GenderType::Male,
            Gender::Transgender => GenderType::Transgender,
            Gender::TransgenderMale => GenderType::TransgenderMale,
            Gender::TransgenderMaleHormone => GenderType::TransgenderMaleHormone,
            Gender::TransgenderMaleSurgical => GenderType::TransgenderMaleSurgical,
            Gender::TransgenderFemale => GenderType::TransgenderFemale,
            Gender::TransgenderFemaleHormone => GenderType::TransgenderFemaleHormone,
            Gender::TransgenderFemaleSurgical => GenderType::TransgenderFemaleSurgical,
            Gender::Unknown => GenderType::Unknown,
            Gender::NonBinary => GenderType::NonBinary,
        }
    }
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
        NameNodeType::from_domain(&self.row().r#type)
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

    pub async fn first_name(&self) -> &Option<String> {
        &self.row().first_name
    }

    pub async fn last_name(&self) -> &Option<String> {
        &self.row().last_name
    }

    pub async fn gender(&self) -> Option<GenderType> {
        self.row().gender.as_ref().map(GenderType::from_domain)
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
}

#[cfg(test)]
mod test {
    use async_graphql::{EmptyMutation, Object};
    use chrono::NaiveDate;
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
                            r.r#type = NameType::Patient;
                            r.code = "some code".to_string();
                            r.first_name = Some("first_name".to_string());
                            r.last_name = Some("last_name".to_string());
                            r.gender = Some(Gender::Female);
                            r.phone = Some("0218738201".to_string());
                            r.charge_code = Some("test".to_string());
                            r.comment = Some("name comment".to_string());
                            r.country = Some("name country".to_string());
                            r.email = Some("name email".to_string());
                            r.website = Some("name website".to_string());
                            r.is_manufacturer = true;
                            r.is_donor = false;
                            r.on_hold = true;
                            r.address1 = Some("address1".to_string());
                            r.address2 = Some("address2".to_string());
                            r.created_datetime = Some(
                                NaiveDate::from_ymd_opt(2022, 05, 18)
                                    .unwrap()
                                    .and_hms_opt(12, 07, 12)
                                    .unwrap(),
                            );
                            r.date_of_birth = Some(NaiveDate::from_ymd_opt(1995, 05, 15).unwrap());
                            r.custom_data_string = Some(r#"{"check": "check"}"#.to_string());
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
                "type": "PATIENT",
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
