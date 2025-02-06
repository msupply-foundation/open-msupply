use async_graphql::{Context, Enum, InputObject, Object, Result, SimpleObject, Union};
use chrono::NaiveDate;
use graphql_core::{
    generic_filters::EqualFilterStringInput, standard_graphql_error::validate_auth, ContextExt,
};
use repository::name_insurance_join_row::{InsurancePolicyType, NameInsuranceJoinRow};
use serde::Serialize;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum PatientInsuranceSortFieldInput {
    ProviderName,
    PolicyType,
    ExpiryDate,
    IsActive,
}

#[derive(InputObject)]
pub struct PatientInsuranceSortInput {
    /// Sort query result by `key`
    key: PatientInsuranceSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct PatientInsuranceFilterInput {
    pub id: Option<EqualFilterStringInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InsurancePolicyNodeType {
    Personal,
    Business,
}
impl InsurancePolicyNodeType {
    pub fn from_domain(policy_type: &InsurancePolicyType) -> InsurancePolicyNodeType {
        use InsurancePolicyType::*;
        match policy_type {
            Personal => InsurancePolicyNodeType::Personal,
            Business => InsurancePolicyNodeType::Business,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct PatientInsuranceNode {
    insurance: NameInsuranceJoinRow,
}

#[Object]
impl PatientInsuranceNode {
    pub async fn id(&self) -> &str {
        &self.insurance.id
    }

    pub async fn name_link_id(&self) -> &str {
        &self.insurance.name_link_id
    }

    pub async fn insurance_provider_id(&self) -> &str {
        &self.insurance.insurance_provider_id
    }

    pub async fn policy_number_person(&self) -> Option<&str> {
        self.insurance.policy_number_person.as_deref()
    }

    pub async fn policy_number_family(&self) -> Option<&str> {
        self.insurance.policy_number_family.as_deref()
    }

    pub async fn policy_number(&self) -> &str {
        &self.insurance.policy_number
    }

    pub async fn policy_type(&self) -> InsurancePolicyNodeType {
        InsurancePolicyNodeType::from_domain(&self.insurance.policy_type)
    }

    pub async fn discount_percentage(&self) -> f64 {
        self.insurance.discount_percentage
    }

    pub async fn expiry_date(&self) -> NaiveDate {
        self.insurance.expiry_date
    }

    pub async fn is_active(&self) -> bool {
        self.insurance.is_active
    }

    pub async fn entered_by_id(&self) -> Option<&str> {
        self.insurance.entered_by_id.as_deref()
    }
}

#[derive(SimpleObject)]
pub struct PatientInsuranceConnector {
    nodes: Vec<PatientInsuranceNode>,
}

#[derive(Union)]
pub enum PatientInsuranceResponse {
    Response(PatientInsuranceConnector),
}

// Currently returning mocked data for testing purposes.
// TODO: Establish a proper connection to the database and return actual data.
pub fn get_patient_insurances(
    ctx: &Context<'_>,
    store_id: String,
    filter: Option<PatientInsuranceFilterInput>,
    sort: Option<Vec<PatientInsuranceSortInput>>,
) -> Result<PatientInsuranceResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryName,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let mock_data_1 = NameInsuranceJoinRow {
        id: "1".to_string(),
        name_link_id: "2".to_string(),
        insurance_provider_id: "3".to_string(),
        policy_number_person: Some("12345".to_string()),
        policy_number_family: Some("67890".to_string()),
        policy_number: "112233".to_string(),
        policy_type: InsurancePolicyType::Personal,
        discount_percentage: 10.0,
        expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
        is_active: true,
        entered_by_id: Some("4".to_string()),
    };

    let mock_data_2 = NameInsuranceJoinRow {
        id: "2".to_string(),
        name_link_id: "3".to_string(),
        insurance_provider_id: "4".to_string(),
        policy_number_person: Some("54321".to_string()),
        policy_number_family: Some("09876".to_string()),
        policy_number: "445566".to_string(),
        policy_type: InsurancePolicyType::Business,
        discount_percentage: 15.0,
        expiry_date: NaiveDate::from_ymd_opt(2024, 11, 30).expect("Invalid date"),
        is_active: false,
        entered_by_id: Some("5".to_string()),
    };

    let mock_data_3 = NameInsuranceJoinRow {
        id: "3".to_string(),
        name_link_id: "4".to_string(),
        insurance_provider_id: "5".to_string(),
        policy_number_person: Some("67890".to_string()),
        policy_number_family: Some("12345".to_string()),
        policy_number: "778899".to_string(),
        policy_type: InsurancePolicyType::Personal,
        discount_percentage: 20.0,
        expiry_date: NaiveDate::from_ymd_opt(2023, 10, 29).expect("Invalid date"),
        is_active: true,
        entered_by_id: Some("6".to_string()),
    };

    let insurance_1 = PatientInsuranceNode {
        insurance: mock_data_1,
    };

    let insurance_2 = PatientInsuranceNode {
        insurance: mock_data_2,
    };

    let insurance_3 = PatientInsuranceNode {
        insurance: mock_data_3,
    };

    let connector = PatientInsuranceConnector {
        nodes: vec![insurance_1, insurance_2, insurance_3],
    };

    let response = PatientInsuranceResponse::Response(connector);

    Ok(response)
}
