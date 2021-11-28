use std::ops::Deref;

use repository::{RepositoryError, StorageConnection, StorageConnectionManager};

use crate::location::{LocationQueryService, LocationQueryServiceTrait};

pub trait ServiceFactoryTrait: Send + Sync {
    fn location_query<'a>(
        &'a self,
        service_connection: ServiceConnection<'a>,
    ) -> Box<dyn LocationQueryServiceTrait + 'a> {
        Box::new(LocationQueryService(service_connection))
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
}
