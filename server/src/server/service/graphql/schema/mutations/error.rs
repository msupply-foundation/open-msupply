use async_graphql::Object;

#[derive(Default)]
pub struct ForeignKeyError;
#[derive(Default)]
pub struct RecordAlreadyExistsError;
#[derive(Default)]
pub struct RecordDoesNotExistError;
#[derive(Default)]
pub struct DatabaseError;

#[Object]
impl ForeignKeyError {
    pub async fn id(&self) -> &str {
        "FOREIGN_KEY_ERROR"
    }

    pub async fn description(&self) -> &str {
        "Foreign key constraint violated."
    }
}

#[Object]
impl RecordAlreadyExistsError {
    pub async fn id(&self) -> &str {
        "RECORD_ALREADY_EXISTS_ERROR"
    }

    pub async fn description(&self) -> &str {
        "Record already exists."
    }
}

#[Object]
impl RecordDoesNotExistError {
    pub async fn id(&self) -> &str {
        "RECORD_DOES_NOT_EXIST_ERROR"
    }

    pub async fn description(&self) -> &str {
        "Record does not exist."
    }
}

#[Object]
impl DatabaseError {
    pub async fn id(&self) -> &str {
        "DATABASE_ERROR"
    }

    pub async fn description(&self) -> &str {
        "A database error occurred."
    }
}
