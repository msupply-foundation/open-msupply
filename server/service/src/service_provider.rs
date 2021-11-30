use std::ops::Deref;

use repository::{RepositoryError, StorageConnection, StorageConnectionManager, TransactionError};

use crate::{
    location::{
        delete::{DeleteLocationService, DeleteLocationServiceTrait},
        insert::{InsertLocationService, InsertLocationServiceTrait},
        update::{UpdateLocationService, UpdateLocationServiceTrait},
        LocationQueryService, LocationQueryServiceTrait,
    },
    WithDBError,
};

pub trait ServiceFactoryTrait: Send + Sync {
    fn location_query<'a>(
        &'a self,
        service_connection: ServiceConnection<'a>,
    ) -> Box<dyn LocationQueryServiceTrait + 'a> {
        Box::new(LocationQueryService(service_connection))
    }

    fn insert_location<'a>(
        &'a self,
        service_connection: ServiceConnection<'a>,
    ) -> Box<dyn InsertLocationServiceTrait + 'a> {
        Box::new(InsertLocationService(service_connection))
    }

    fn update_location<'a>(
        &'a self,
        service_connection: ServiceConnection<'a>,
    ) -> Box<dyn UpdateLocationServiceTrait + 'a> {
        Box::new(UpdateLocationService(service_connection))
    }

    fn delete_location<'a>(
        &'a self,
        service_connection: ServiceConnection<'a>,
    ) -> Box<dyn DeleteLocationServiceTrait + 'a> {
        Box::new(DeleteLocationService(service_connection))
    }
}

pub struct ServiceFactory;
impl ServiceFactoryTrait for ServiceFactory {}
impl ServiceFactory {
    pub fn new() -> Self {
        ServiceFactory {}
    }
}

pub enum ServiceConnection<'a> {
    Connection(StorageConnection),
    ConnectionAsRef(&'a StorageConnection),
}

impl<'a> Deref for ServiceConnection<'a> {
    type Target = StorageConnection;

    fn deref(&self) -> &Self::Target {
        match self {
            ServiceConnection::Connection(connection) => connection,
            ServiceConnection::ConnectionAsRef(connection) => connection,
        }
    }
}

impl<'a> ServiceConnection<'a> {
    pub fn duplicate(&'a self) -> ServiceConnection<'a> {
        use ServiceConnection::*;
        match self {
            Connection(connection) => ConnectionAsRef(&connection),
            ConnectionAsRef(connection) => ConnectionAsRef(connection),
        }
    }
    pub fn transaction<T, E, F>(&'a self, f: F) -> Result<T, WithDBError<E>>
    where
        F: FnOnce(ServiceConnection<'a>) -> Result<T, E>,
    {
        let result =
            self.transaction_sync(|connection| f(ServiceConnection::ConnectionAsRef(connection)));

        result.map_err(WithDBError::from)
    }
}

impl<E> From<TransactionError<E>> for WithDBError<E> {
    fn from(error: TransactionError<E>) -> Self {
        match error {
            TransactionError::Transaction { msg } => {
                WithDBError::DatabaseError(RepositoryError::as_db_error(&msg, ""))
            }
            TransactionError::Inner(error) => WithDBError::Error(error),
        }
    }
}

pub struct ServiceProvider {
    pub connection_manager: StorageConnectionManager,
    pub service_factory: Box<dyn ServiceFactoryTrait>,
}

impl ServiceProvider {
    pub fn new(connection_manager: StorageConnectionManager) -> Self {
        ServiceProvider {
            connection_manager,
            service_factory: Box::new(ServiceFactory::new()),
        }
    }

    pub fn service_connection(&self) -> Result<ServiceConnection, RepositoryError> {
        Ok(ServiceConnection::Connection(
            self.connection_manager.connection()?,
        ))
    }

    pub fn location_query<'a>(
        &'a self,
    ) -> Result<Box<dyn LocationQueryServiceTrait + 'a>, RepositoryError> {
        Ok(self
            .service_factory
            .location_query(self.service_connection()?))
    }

    pub fn insert_location<'a>(
        &'a self,
    ) -> Result<Box<dyn InsertLocationServiceTrait + 'a>, RepositoryError> {
        Ok(self
            .service_factory
            .insert_location(self.service_connection()?))
    }

    pub fn update_location<'a>(
        &'a self,
    ) -> Result<Box<dyn UpdateLocationServiceTrait + 'a>, RepositoryError> {
        Ok(self
            .service_factory
            .update_location(self.service_connection()?))
    }

    pub fn delete_location<'a>(
        &'a self,
    ) -> Result<Box<dyn DeleteLocationServiceTrait + 'a>, RepositoryError> {
        Ok(self
            .service_factory
            .delete_location(self.service_connection()?))
    }
}
