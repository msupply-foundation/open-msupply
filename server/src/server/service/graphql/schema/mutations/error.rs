use async_graphql::Object;

pub struct ForeignKeyError;

#[Object]
impl ForeignKeyError {
    pub async fn id(&self) -> &str {
        "FOREIGN_KEY_ERROR"
    }

    pub async fn description(&self) -> &str {
        "Foreign key constraint violated."
    }
}

pub struct RecordAlreadyExistsError;

#[Object]
impl RecordAlreadyExistsError {
    pub async fn id(&self) -> &str {
        "RECORD_ALREADY_EXISTS_ERROR"
    }

    pub async fn description(&self) -> &str {
        "Record already exists."
    }
}

pub struct RecordDoesNotExistError;

#[Object]
impl RecordDoesNotExistError {
    pub async fn id(&self) -> &str {
        "RECORD_DOES_NOT_EXIST_ERROR"
    }

    pub async fn description(&self) -> &str {
        "Record does not exist."
    }
}

pub struct DatabaseError;

#[Object]
impl DatabaseError {
    pub async fn id(&self) -> &str {
        "DATABASE_ERROR"
    }

    pub async fn description(&self) -> &str {
        "A database error occurred."
    }
}
