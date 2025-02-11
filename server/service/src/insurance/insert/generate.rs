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
        policy_number_person,
        policy_number,
        policy_type,
        discount_percentage,
        expiry_date,
        is_active,
        // Ingore insurance_provider_name - not a field in NameInsuranceJoinRow
        ..
    } = insert_input;

    NameInsuranceJoinRow {
        id,
        name_link_id,
        insurance_provider_id,
        policy_number_person,
        policy_number_family: None,
        policy_number,
        policy_type,
        discount_percentage,
        expiry_date,
        is_active,
        entered_by_id: None,
    }
}
