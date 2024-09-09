use async_graphql::*;

use repository::{Vaccination, VaccinationRow};

#[derive(PartialEq, Debug)]
pub struct VaccinationNode {
    pub vaccination: Vaccination,
}

#[Object]
impl VaccinationNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    // TODO
}

impl VaccinationNode {
    pub fn from_domain(vaccination: Vaccination) -> VaccinationNode {
        VaccinationNode { vaccination }
    }

    pub fn row(&self) -> &VaccinationRow {
        &self.vaccination.vaccination_row
    }
}
