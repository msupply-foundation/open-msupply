use chrono::NaiveDateTime;
use repository::{FeedbackForm, RepositoryError};

//error enum
//each of these should have a test
#[derive(PartialEq, Debug)]
pub enum InsertContactFormError {
    ContactIdAlreadyExists,
    EmailIsInvalid,
    EmailDoesNotExist,
    MessageDoesNotExist,
    InternalError(String),
    DatabaseError(RepositoryError),
    //message valid eg /n
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertContactForm {
    pub id: String,
    pub reply_email: String,
    pub body: String,
    pub created_datetime: NaiveDateTime,
    pub site_id: String,
    pub store_id: String,
    pub user_id: String,
}

//insert struct

//insert function
//do db changes within a transaction

//map errors - repository error

//TESTS - later
//#[cfg(test)]

//asset insert
//start in validate fn
