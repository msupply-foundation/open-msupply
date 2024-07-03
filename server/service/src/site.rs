use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};
use log::error;
use repository::{
    RepositoryError, SiteRow, SiteRowRepository, StorageConnection, StoreRowRepository,
    TransactionError,
};

pub struct CreateSite {
    pub id: String,
    pub site_id: i32,
    pub hardware_id: String,
    pub name: String,
    pub password: String,
    pub store_ids: Vec<String>,
}

pub type Site = SiteRow;

#[derive(Debug)]
pub enum CreateSiteError {
    SiteNameAlreadyExists,
    PasswordHashError(BcryptError),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for CreateSiteError {
    fn from(err: RepositoryError) -> Self {
        CreateSiteError::DatabaseError(err)
    }
}

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

    pub fn create_site(&self, site: CreateSite) -> Result<Site, CreateSiteError> {
        self.connection
            .transaction_sync(|con| {
                let repo = SiteRowRepository::new(con);
                // todo site already exists (by id?)

                if let Some(_) = repo
                    .find_one_by_name(&site.name)
                    .map_err(CreateSiteError::DatabaseError)?
                {
                    return Err(CreateSiteError::SiteNameAlreadyExists);
                }

                let hashed_password = SiteService::hash_password(&site.password)
                    .map_err(CreateSiteError::PasswordHashError)?;

                let row = SiteRow {
                    id: site.id,
                    name: site.name,
                    hashed_password,
                    site_id: site.site_id, // TODO: should be assigned not sent!
                    hardware_id: site.hardware_id,
                };
                repo.upsert_one(&row)?;

                let store_row_repo = StoreRowRepository::new(con);
                for store_id in site.store_ids {
                    store_row_repo.update_om_site_id(&store_id, Some(site.site_id))?;
                }

                Ok(row)
            })
            .map_err(|error: TransactionError<CreateSiteError>| match error {
                TransactionError::Transaction { msg, level } => {
                    RepositoryError::TransactionError { msg, level }.into()
                }
                TransactionError::Inner(error) => error,
            })
    }

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
