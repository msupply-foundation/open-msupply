use async_graphql::{Object, SimpleObject, Union};
use repository::contact_row::ContactRow;

#[derive(PartialEq, Debug)]
pub struct ContactNode {
    contact: ContactRow,
}

#[Object]
impl ContactNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn first_name(&self) -> &str {
        &self.row().first_name
    }
    pub async fn position(&self) -> &Option<String> {
        &self.row().position
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }
    pub async fn last_name(&self) -> &str {
        &self.row().last_name
    }
    pub async fn phone(&self) -> &Option<String> {
        &self.row().phone
    }
    pub async fn email(&self) -> &Option<String> {
        &self.row().email
    }
    pub async fn category_1(&self) -> &Option<String> {
        &self.row().category_1
    }
    pub async fn category_2(&self) -> &Option<String> {
        &self.row().category_2
    }
    pub async fn category_3(&self) -> &Option<String> {
        &self.row().category_3
    }
    pub async fn address_1(&self) -> &Option<String> {
        &self.row().address_1
    }
    pub async fn address_2(&self) -> &Option<String> {
        &self.row().address_2
    }
    pub async fn country(&self) -> &Option<String> {
        &self.row().country
    }
}

impl ContactNode {
    pub fn from_domain(contact: ContactRow) -> ContactNode {
        ContactNode { contact }
    }

    pub fn row(&self) -> &ContactRow {
        &self.contact
    }
}

#[derive(SimpleObject)]
pub struct ContactConnector {
    nodes: Vec<ContactNode>,
}

impl ContactConnector {
    pub fn from_domain(contacts: Vec<ContactRow>) -> ContactConnector {
        ContactConnector {
            nodes: contacts.into_iter().map(ContactNode::from_domain).collect(),
        }
    }
}

#[derive(Union)]
pub enum ContactsResponse {
    Response(ContactConnector),
}
