use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, TransactRow, TransactRowType};

use log::info;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct TransactRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl TransactRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> TransactRepository {
        TransactRepository { mock_data }
    }

    pub async fn insert_one(&self, transact: &TransactRow) -> Result<(), RepositoryError> {
        info!("Inserting transact record (transact.id={})", transact.id);
        self.mock_data.lock().unwrap().insert(
            transact.id.to_string(),
            DatabaseRow::Transact(transact.clone()),
        );
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<TransactRow, RepositoryError> {
        info!("Querying transact record (transact.id={})", id);
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::Transact(transact)) => Ok(transact.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!(
                    "Failed to find transact record (transact.id={})",
                    id
                )),
            }),
        }
    }

    pub async fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        info!(
            "Querying multiple transact records (transact.id=({:?})",
            ids
        );
        let mut transacts = vec![];
        ids.iter().for_each(|id| {
            if let Some(DatabaseRow::Transact(transact)) = self.mock_data.lock().unwrap().get(id) {
                transacts.push(transact.clone());
            }
        });
        Ok(transacts)
    }
}

#[derive(Clone)]
pub struct CustomerInvoiceRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl CustomerInvoiceRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> CustomerInvoiceRepository {
        CustomerInvoiceRepository { mock_data }
    }

    pub async fn find_many_by_name_id(
        &self,
        name_id: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        info!(
            "Querying transact_line records (transact_line.name_id={})",
            name_id
        );

        let mut customer_invoices = vec![];
        self.mock_data.lock().unwrap().clone().into_iter().for_each(
            |(_id, row): (String, DatabaseRow)| {
                if let DatabaseRow::Transact(transact) = row {
                    if transact.type_of == TransactRowType::CustomerInvoice
                        && transact.name_id == name_id
                    {
                        customer_invoices.push(transact);
                    }
                }
            },
        );
        Ok(customer_invoices)
    }

    pub async fn find_many_by_store_id(
        &self,
        store_id: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        info!(
            "Querying customer_invoice records (transact.store_id={})",
            store_id
        );
        let mut customer_invoices = vec![];
        self.mock_data.lock().unwrap().clone().into_iter().for_each(
            |(_id, row): (String, DatabaseRow)| {
                if let DatabaseRow::Transact(transact) = row {
                    if transact.type_of == TransactRowType::CustomerInvoice
                        && transact.store_id == store_id
                    {
                        customer_invoices.push(transact);
                    }
                }
            },
        );
        Ok(customer_invoices)
    }
}
