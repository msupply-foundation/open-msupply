use repository::{
    schema::UserAccountRow, RepositoryError, StorageConnection, TransactionError,
    UserAccountRowRepository,
};
use util::uuid::uuid;

use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};
use log::error;

pub struct CreateUserAccount {
    pub username: String,
    pub password: String,
    pub email: Option<String>,
}

pub type UserAccount = UserAccountRow;

#[derive(Debug)]
pub enum CreateUserAccountError {
    UserNameExist,
    PasswordHashError(BcryptError),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for CreateUserAccountError {
    fn from(err: RepositoryError) -> Self {
        CreateUserAccountError::DatabaseError(err)
    }
}

#[derive(Debug)]
pub enum VerifyPasswordError {
    UsernameDoesNotExist,
    InvalidCredentials,
    /// Invalid account data on the backend
    InvalidCredentialsBackend(bcrypt::BcryptError),
    DatabaseError(RepositoryError),
}

pub struct UserAccountService<'a> {
    connection: &'a StorageConnection,
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
                let repo = UserAccountRowRepository::new(con);
                if let Some(_) = repo
                    .find_one_by_user_name(&user.username)
                    .map_err(|e| CreateUserAccountError::DatabaseError(e))?
                {
                    return Err(CreateUserAccountError::UserNameExist);
                }
                let hashed_password = match hash(user.password, DEFAULT_COST) {
                    Ok(pwd) => pwd,
                    Err(err) => {
                        error!("create_user: Failed to hash password");
                        return Err(CreateUserAccountError::PasswordHashError(err));
                    }
                };
                let row = UserAccountRow {
                    id: uuid(),
                    username: user.username,
                    hashed_password: hashed_password,
                    email: user.email,
                };
                repo.insert_one(&row)?;
                Ok(row)
            })
            .map_err(
                |error: TransactionError<CreateUserAccountError>| match error {
                    TransactionError::Transaction { msg, level } => {
                        RepositoryError::TransactionError { msg, level }.into()
                    }
                    TransactionError::Inner(error) => error,
                },
            )
    }

    pub fn find_user(&self, user_id: &str) -> Result<Option<UserAccount>, RepositoryError> {
        let repo = UserAccountRowRepository::new(self.connection);
        repo.find_one_by_id(user_id)
    }

    /// Finds a user account and verifies that the password is ok
    pub fn verify_password(
        &self,
        username: &str,
        password: &str,
    ) -> Result<UserAccount, VerifyPasswordError> {
        let repo = UserAccountRowRepository::new(self.connection);
        let user = match repo
            .find_one_by_user_name(username)
            .map_err(|e| VerifyPasswordError::DatabaseError(e))?
        {
            Some(user) => user,
            None => return Err(VerifyPasswordError::UsernameDoesNotExist),
        };
        // verify password
        let valid = verify(password, &user.hashed_password).map_err(|err| {
            error!("verify_password: {}", err);
            VerifyPasswordError::InvalidCredentialsBackend(err)
        })?;
        if !valid {
            return Err(VerifyPasswordError::InvalidCredentials);
        }

        Ok(user)
    }
}

#[cfg(test)]
mod user_account_test {
    use repository::{get_storage_connection_manager, test_db};

    use super::*;

    #[actix_rt::test]
    async fn test_user_auth() {
        let settings = test_db::get_test_db_settings("omsupply-database-user-account-service");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        let service = UserAccountService::new(&connection);

        // should be able to create a new user
        let username = "testuser";
        let password = "passw0rd";
        service
            .create_user(CreateUserAccount {
                username: username.to_string(),
                password: password.to_string(),
                email: None,
            })
            .unwrap();

        // should be able to verify correct username and password
        service.verify_password(username, password).unwrap();

        // should fail to verify wrong password
        let err = service.verify_password(username, "wrong").unwrap_err();
        assert!(matches!(err, VerifyPasswordError::InvalidCredentials));

        // should fail to find invalid user
        let err = service.verify_password("invalid", password).unwrap_err();
        assert!(
            matches!(err, VerifyPasswordError::UsernameDoesNotExist),
            "{:?}",
            err
        );
    }
}
