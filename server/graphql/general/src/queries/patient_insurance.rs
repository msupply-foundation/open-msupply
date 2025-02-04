use async_graphql::{Context, Enum, InputObject, Object, OutputType, Result, SimpleObject, Union};
use chrono::NaiveDate;
use graphql_core::{
    generic_filters::EqualFilterStringInput, standard_graphql_error::validate_auth, ContextExt,
};
use repository::name_insurance_join_row::{InsurancePolicyType, NameInsuranceJoinRow};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum PatientInsuranceSortFieldInput {
    Id,
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

    // pub async fn policy_type(&self) -> &InsurancePolicyType {
    //     &self.insurance.policy_type
    // }

    pub async fn discount_percentage(&self) -> i32 {
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
    insurances: Vec<PatientInsuranceNode>,
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
    // let user = validate_auth(
    //     ctx,
    //     &ResourceAccessRequest {
    //         resource: Resource::QueryName,
    //         store_id: Some(store_id.clone()),
    //     },
    // )?;

    // let service_provider = ctx.service_provider();
    // let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let mock_data = NameInsuranceJoinRow {
        id: "1".to_string(),
        name_link_id: "2".to_string(),
        insurance_provider_id: "3".to_string(),
        policy_number_person: Some("12345".to_string()),
        policy_number_family: Some("67890".to_string()),
        policy_number: "112233".to_string(),
        policy_type: InsurancePolicyType::Personal,
        discount_percentage: 10,
        expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
        is_active: true,
        entered_by_id: Some("4".to_string()),
    };

    let insurance = PatientInsuranceNode {
        insurance: mock_data,
    };

    let connector = PatientInsuranceConnector {
        insurances: vec![insurance],
    };

    let response = PatientInsuranceResponse::Response(connector);

    Ok(response)
}
