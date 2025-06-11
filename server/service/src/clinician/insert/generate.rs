use repository::clinician_row::ClinicianRow;

use super::InsertClinician;

pub struct GenerateInput {
    pub store_id: String,
    pub insert_input: InsertClinician,
}

pub fn generate(
    GenerateInput {
        store_id,
        insert_input,
    }: GenerateInput,
) -> ClinicianRow {
    let InsertClinician {
        id,
        code,
        initials,
        last_name,
        first_name,
        gender,
    } = insert_input;

    ClinicianRow {
        id,
        store_id: Some(store_id),
        code,
        last_name,
        initials,
        first_name,
        gender,
        is_active: true,

        // Defaults for now
        address1: None,
        address2: None,
        phone: None,
        mobile: None,
        email: None,
    }

    // TODO also join
}
