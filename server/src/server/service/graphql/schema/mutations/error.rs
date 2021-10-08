use crate::database::repository::RepositoryError;

use async_graphql::Object;

pub struct DatabaseError(RepositoryError);

#[Object]
impl DatabaseError {
    pub async fn description(&self) -> String {
        format!("{}", self.0)
    }
}

impl From<RepositoryError> for DatabaseError {
    fn from(error: RepositoryError) -> Self {
        DatabaseError(error)
    }
}
