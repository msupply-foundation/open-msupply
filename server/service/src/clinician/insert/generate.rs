use repository::{clinician_row::ClinicianRow, ClinicianStoreJoinRow};
use util::uuid::uuid;

use super::InsertClinician;

pub struct GenerateInput {
    pub store_id: String,
    pub insert_input: InsertClinician,
}

pub struct GenerateResult {
    pub clinician: ClinicianRow,
    pub clinician_store_join: ClinicianStoreJoinRow,
}

pub fn generate(
    GenerateInput {
        store_id,
        insert_input,
    }: GenerateInput,
) -> GenerateResult {
    let InsertClinician {
        id,
        code,
        initials,
        last_name,
        first_name,
        gender,
        mobile,
    } = insert_input;

    let clinician = ClinicianRow {
        id: id.clone(),
        store_id: Some(store_id.clone()),
        code,
        last_name,
        initials,
        first_name,
        gender,
        is_active: true,
        mobile,

        // Defaults for now
        address1: None,
        address2: None,
        phone: None,
        email: None,
    };

    let clinician_store_join = ClinicianStoreJoinRow {
        id: uuid(),
        clinician_link_id: id,
        store_id,
    };

    GenerateResult {
        clinician,
        clinician_store_join,
    }
}
