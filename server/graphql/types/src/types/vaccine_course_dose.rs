use async_graphql::*;

use repository::vaccine_course::vaccine_course_dose_row::VaccineCourseDoseRow;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseDoseNode {
    pub vaccine_course_dose: VaccineCourseDoseRow,
}

#[Object]
impl VaccineCourseDoseNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn dose_number(&self) -> &i32 {
        &self.row().dose_number
    }

    pub async fn label(&self) -> &str {
        &self.row().label
    }

    pub async fn min_age_months(&self) -> &f64 {
        // TODO
        &6.0
    }

    pub async fn min_interval_days(&self) -> &i32 {
        // TODO
        &30
    }
}

impl VaccineCourseDoseNode {
    pub fn from_domain(vaccine_course_dose: VaccineCourseDoseRow) -> VaccineCourseDoseNode {
        VaccineCourseDoseNode {
            vaccine_course_dose: vaccine_course_dose,
        }
    }

    pub fn row(&self) -> &VaccineCourseDoseRow {
        &self.vaccine_course_dose
    }
}
