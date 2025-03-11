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
        insurance_provider_id,
        policy_type,
        discount_percentage,
        expiry_date,
        is_active,
    } = update_input;

    NameInsuranceJoinRow {
        id,
        insurance_provider_id: insurance_provider_id
            .unwrap_or(name_insurance_join_row.insurance_provider_id),
        policy_type: policy_type.unwrap_or(name_insurance_join_row.policy_type),
        discount_percentage: discount_percentage
            .unwrap_or(name_insurance_join_row.discount_percentage),
        expiry_date: expiry_date.unwrap_or(name_insurance_join_row.expiry_date),
        is_active: is_active.unwrap_or(name_insurance_join_row.is_active),
        ..name_insurance_join_row
    }
}
