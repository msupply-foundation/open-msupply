use async_graphql::*;
use repository::{Clinician, ClinicianRow};

use crate::types::patient::GenderType;

#[derive(PartialEq, Debug)]
pub struct ClinicianNode {
    pub clinician: Clinician,
}

impl ClinicianNode {
    pub fn from_domain(clinician: Clinician) -> Self {
        ClinicianNode { clinician }
    }

    pub fn row(&self) -> &ClinicianRow {
        &self.clinician
    }
}

#[Object]
impl ClinicianNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn last_name(&self) -> &str {
        &self.row().last_name
    }

    pub async fn initials(&self) -> &str {
        &self.row().initials
    }

    pub async fn first_name(&self) -> &Option<String> {
        &self.row().first_name
    }

    pub async fn address1(&self) -> &Option<String> {
        &self.row().address1
    }

    pub async fn address2(&self) -> &Option<String> {
        &self.row().address2
    }

    pub async fn phone(&self) -> &Option<String> {
        &self.row().phone
    }

    pub async fn mobile(&self) -> &Option<String> {
        &self.row().mobile
    }

    pub async fn email(&self) -> &Option<String> {
        &self.row().email
    }

    pub async fn gender(&self) -> Option<GenderType> {
        self.row().gender.as_ref().map(GenderType::from_domain)
    }
}
