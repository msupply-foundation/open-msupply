use async_graphql::Object;

pub struct ForeignKeyError;

#[Object]
impl ForeignKeyError {
    pub async fn description(&self) -> &str {
        "Foreign key constraint violated."
    }
}

pub struct RecordAlreadyExistsError;

#[Object]
impl RecordAlreadyExistsError {
    pub async fn description(&self) -> &str {
        "Record already exists."
    }
}

pub struct RecordDoesNotExistError;

#[Object]
impl RecordDoesNotExistError {
    pub async fn description(&self) -> &str {
        "Record does not exist."
    }
}

pub struct DatabaseError;

#[Object]
impl DatabaseError {
    pub async fn description(&self) -> &str {
        "A database error occurred."
    }
}
