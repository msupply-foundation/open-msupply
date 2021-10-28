use crate::{
    database::{
        repository::{RepositoryError, StorageConnection, TransactionError, UserAccountRepository},
        schema::UserAccountRow,
    },
    util::uuid::uuid,
};

use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};

pub struct UserAccountService<'a> {
    connection: &'a StorageConnection,
}

pub struct CreateUserAccount {
    pub username: String,
    pub password: String,
    pub email: Option<String>,
}

pub type UserAccount = UserAccountRow;

pub enum CreateUserAccountError {
    UserNameExist,
    DatabaseError(RepositoryError),
    PasswordHashError(BcryptError),
}

impl From<RepositoryError> for CreateUserAccountError {
    fn from(err: RepositoryError) -> Self {
        CreateUserAccountError::DatabaseError(err)
    }
}

impl<'a> UserAccountService<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserAccountService { connection }
    }

    pub fn create_user(
        &self,
        user: CreateUserAccount,
    ) -> Result<UserAccount, CreateUserAccountError> {
        self.connection
            .transaction_sync(|con| {
                let repo = UserAccountRepository::new(con);
                if let Ok(_) = repo.find_one_by_user_name(&user.username) {
                    return Err(CreateUserAccountError::UserNameExist);
                }
                let hashed_password = match hash(user.password, DEFAULT_COST) {
                    Ok(pwd) => pwd,
                    Err(err) => return Err(CreateUserAccountError::PasswordHashError(err)),
                };
                let row = UserAccountRow {
                    id: uuid(),
                    username: user.username,
                    password: hashed_password,
                    email: user.email,
                };
                repo.insert_one(&row)?;
                Ok(row)
            })
            .map_err(
                |error: TransactionError<CreateUserAccountError>| match error {
                    TransactionError::Transaction { msg } => {
                        RepositoryError::as_db_error(&msg, "").into()
                    }
                    TransactionError::Inner(error) => error,
                },
            )
    }
}
