use async_graphql::Object;
use repository::repository::RepositoryError;

pub struct DatabaseError(pub RepositoryError);

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
