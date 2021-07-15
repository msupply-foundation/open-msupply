use crate::database::repository::RepositoryError;
use crate::database::schema::{TransactRow, TransactRowType};

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct TransactRepository {
    mock_data: Arc<Mutex<HashMap<String, TransactRow>>>,
}

impl TransactRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, TransactRow>>>) -> TransactRepository {
        TransactRepository { mock_data }
    }

    pub async fn insert_one(&self, transact: &TransactRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(transact.id.clone()), transact.clone());

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<TransactRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(transact) => Ok(transact.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find transact {}", id)),
            }),
        }
    }
}

#[derive(Clone)]
pub struct CustomerInvoiceRepository {
    mock_data: Arc<Mutex<HashMap<String, TransactRow>>>,
}

impl CustomerInvoiceRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, TransactRow>>>) -> CustomerInvoiceRepository {
        CustomerInvoiceRepository { mock_data }
    }

    pub async fn find_many_by_name_id(
        &self,
        name_id: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        let mut customer_invoices = vec![];
        for (_id, transact) in self.mock_data.lock().unwrap().clone().into_iter() {
            if transact.type_of == TransactRowType::CustomerInvoice && transact.name_id == name_id {
                customer_invoices.push(transact);
            }
        }

        Ok(customer_invoices)
    }

    pub async fn find_many_by_store_id(
        &self,
        store_id: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        let mut customer_invoices = vec![];
        for (_id, transact) in self.mock_data.lock().unwrap().clone().into_iter() {
            if transact.type_of == TransactRowType::SupplierInvoice && transact.store_id == store_id
            {
                customer_invoices.push(transact);
            }
        }

        Ok(customer_invoices)
    }
}
