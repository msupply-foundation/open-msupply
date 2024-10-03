use async_graphql::Object;

pub mod insert;
pub mod update;

pub struct NotMostRecentGivenDose;

#[Object]
impl NotMostRecentGivenDose {
    pub async fn description(&self) -> &str {
        "Cannot update this vaccination as it is not the most recent given dose"
    }
}
