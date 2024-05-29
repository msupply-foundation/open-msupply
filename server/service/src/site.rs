use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};
use log::error;
use repository::{RepositoryError, SiteRow, SiteRowRepository, StorageConnection};

// pub struct CreateSite {
//     pub username: String,
//     pub password: String,
//     pub email: Option<String>,
// }

pub type Site = SiteRow;

// #[derive(Debug)]
// pub enum CreateSiteError {
//     UserNameExist,
//     PasswordHashError(BcryptError),
//     DatabaseError(RepositoryError),
// }

// impl From<RepositoryError> for CreateSiteError {
//     fn from(err: RepositoryError) -> Self {
//         CreateSiteError::DatabaseError(err)
//     }
// }

#[derive(Debug)]
pub enum VerifyPasswordError {
    SiteNameDoesNotExist,
    InvalidCredentials,
    /// Invalid account data on the backend
    InvalidCredentialsBackend(bcrypt::BcryptError),
    DatabaseError(RepositoryError),
}

pub struct SiteService<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SiteService<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SiteService { connection }
    }

    pub fn hash_password(password: &str) -> Result<String, BcryptError> {
        let hashed_password = hash(password, DEFAULT_COST);
        if let Err(err) = &hashed_password {
            error!("create_site: Failed to hash password. {:#?}", err);
        }
        hashed_password
    }

    // pub fn create_site(&self, site: CreateSite) -> Result<Site, CreateSiteError> {
    //     self.connection
    //         .transaction_sync(|con| {
    //             let repo = SiteRowRepository::new(con);
    //             if let Some(_) = repo
    //                 .find_one_by_user_name(&user.username)
    //                 .map_err(CreateSiteError::DatabaseError)?
    //             {
    //                 return Err(CreateSiteError::UserNameExist);
    //             }

    //             let hashed_password = UserAccountService::hash_password(&user.password)
    //                 .map_err(CreateSiteError::PasswordHashError)?;

    //             let row = UserAccountRow {
    //                 id: uuid(),
    //                 username: user.username,
    //                 hashed_password,
    //                 email: user.email,
    //                 ..UserAccountRow::default()
    //             };
    //             repo.insert_one(&row)?;
    //             Ok(row)
    //         })
    //         .map_err(
    //             |error: TransactionError<CreateSiteError>| match error {
    //                 TransactionError::Transaction { msg, level } => {
    //                     RepositoryError::TransactionError { msg, level }.into()
    //                 }
    //                 TransactionError::Inner(error) => error,
    //             },
    //         )
    // }

    /// Finds a site and verifies that the password is ok
    pub fn verify_password(
        &self,
        site_name: &str,
        password: &str,
    ) -> Result<Site, VerifyPasswordError> {
        let repo = SiteRowRepository::new(self.connection);
        let site = match repo
            .find_one_by_name(site_name)
            .map_err(VerifyPasswordError::DatabaseError)?
        {
            Some(user) => user,
            None => return Err(VerifyPasswordError::SiteNameDoesNotExist),
        };
        // verify password
        let valid = verify(password, &site.hashed_password).map_err(|err| {
            error!("verify_password: {}", err);
            VerifyPasswordError::InvalidCredentialsBackend(err)
        })?;
        if !valid {
            return Err(VerifyPasswordError::InvalidCredentials);
        }

        Ok(site)
    }
}
