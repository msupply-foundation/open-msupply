use repository::name_insurance_join_row::NameInsuranceJoinRow;

use super::UpdateInsurance;

pub struct GenerateInput {
    pub update_input: UpdateInsurance,
    pub name_insurance_join_row: NameInsuranceJoinRow,
}

pub fn generate(
    GenerateInput {
        update_input,
        name_insurance_join_row,
    }: GenerateInput,
) -> NameInsuranceJoinRow {
    let UpdateInsurance {
        id,
        name_link_id,
        insurance_provider_id,
        policy_number,
        policy_type,
        discount_percentage,
        expiry_date,
        is_active,
    } = update_input;

    NameInsuranceJoinRow {
        id,
        name_link_id: name_link_id.unwrap_or(name_insurance_join_row.name_link_id),
        insurance_provider_id: insurance_provider_id
            .unwrap_or(name_insurance_join_row.insurance_provider_id),
        policy_number_person: name_insurance_join_row.policy_number_person,
        policy_number_family: name_insurance_join_row.policy_number_family,
        policy_number: policy_number.unwrap_or(name_insurance_join_row.policy_number),
        policy_type: policy_type.unwrap_or(name_insurance_join_row.policy_type),
        discount_percentage: discount_percentage
            .unwrap_or(name_insurance_join_row.discount_percentage),
        expiry_date: expiry_date.unwrap_or(name_insurance_join_row.expiry_date),
        is_active: is_active.unwrap_or(name_insurance_join_row.is_active),
        entered_by_id: name_insurance_join_row.entered_by_id,
    }
}
