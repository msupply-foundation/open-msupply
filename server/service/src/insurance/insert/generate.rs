use repository::name_insurance_join_row::NameInsuranceJoinRow;

use super::InsertInsurance;

pub struct GenerateInput {
    pub insert_input: InsertInsurance,
}

pub fn generate(GenerateInput { insert_input }: GenerateInput) -> NameInsuranceJoinRow {
    let InsertInsurance {
        id,
        name_link_id,
        insurance_provider_id,
        policy_number_family,
        policy_number_personal,
        policy_type,
        discount_percentage,
        expiry_date,
        is_active,
    } = insert_input;

    let policy_number = compose_policy_number(
        Some(policy_number_family.clone()),
        Some(policy_number_personal.clone()),
    );

    NameInsuranceJoinRow {
        id,
        name_link_id,
        insurance_provider_id,
        policy_number,
        policy_number_family: Some(policy_number_family),
        policy_number_person: Some(policy_number_personal),
        policy_type,
        discount_percentage,
        expiry_date,
        is_active,
        entered_by_id: None,
    }
}

fn compose_policy_number(
    policy_number_family: Option<String>,
    policy_number_personal: Option<String>,
) -> String {
    match (policy_number_family, policy_number_personal) {
        (Some(family), Some(personal)) => format!("{}-{}", family, personal),
        (Some(family), None) => family,
        (None, Some(personal)) => personal,
        (None, None) => "".to_string(),
    }
}
