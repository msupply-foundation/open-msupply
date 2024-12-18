use super::{contact_form_row::ContactFormRow, StorageConnection, StoreRow, UserAccountRow};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct ContactForm {
    pub contact_form_row: ContactFormRow,
    pub user_row: UserAccountRow,
    pub store_row: StoreRow,
}

pub struct ContactFormRepository<'a> {
    _connection: &'a StorageConnection,
}

impl<'a> ContactFormRepository<'a> {
    pub fn new(_connection: &'a StorageConnection) -> Self {
        ContactFormRepository { _connection }
    }
}
