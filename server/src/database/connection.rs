use crate::database;

#[derive(Clone)]
pub struct DatabaseConnection {
    pool: sqlx::PgPool,
}

impl DatabaseConnection {
    pub async fn new(pool: sqlx::PgPool) -> DatabaseConnection {
        DatabaseConnection { pool }
    }

    pub async fn insert_mock_data(&self) -> Result<(), sqlx::Error> {
        self.create_names(&database::mocks::mock_names())
            .await
            .expect("Failed to insert mock name data");

        self.create_stores(&database::mocks::mock_stores())
            .await
            .expect("Failed to insert mock store data");

        self.create_items(&database::mocks::mock_items())
            .await
            .expect("Failed to insert mock item data");

        self.create_item_lines(&database::mocks::mock_item_lines())
            .await
            .expect("Failed to insert mock item line data");

        self.create_requisitions(&database::mocks::mock_requisitions())
            .await
            .expect("Failed to insert mock requisition data");

        self.create_requisition_lines(&database::mocks::mock_requisition_lines())
            .await
            .expect("Failed to insert mock requisition line data");

        Ok(())
    }

    #[allow(dead_code)]
    pub async fn create_user_account(
        &self,
        user_account: &database::schema::UserAccountRow,
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_user_acount(&self.pool, user_account).await
    }

    #[allow(dead_code)]
    pub async fn create_store(
        &self,
        store: &database::schema::StoreRow,
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_store(&self.pool, store).await
    }

    #[allow(dead_code)]
    pub async fn create_stores(
        &self,
        stores: &[database::schema::StoreRow],
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_stores(&self.pool, stores).await
    }

    #[allow(dead_code)]
    pub async fn create_name(&self, name: &database::schema::NameRow) -> Result<(), sqlx::Error> {
        database::queries::insert_name(&self.pool, name).await
    }

    #[allow(dead_code)]
    pub async fn create_names(
        &self,
        names: &[database::schema::NameRow],
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_names(&self.pool, names).await
    }

    pub async fn create_item(&self, item: &database::schema::ItemRow) -> Result<(), sqlx::Error> {
        database::queries::insert_item(&self.pool, item).await
    }

    pub async fn create_items(
        &self,
        items: &[database::schema::ItemRow],
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_items(&self.pool, items).await
    }

    #[allow(dead_code)]
    pub async fn create_item_line(
        &self,
        item_line: &database::schema::ItemLineRow,
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_item_line(&self.pool, item_line).await
    }

    #[allow(dead_code)]
    pub async fn create_item_lines(
        &self,
        item_lines: &[database::schema::ItemLineRow],
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_item_lines(&self.pool, item_lines).await
    }

    pub async fn create_requisition(
        &self,
        requisition: &database::schema::RequisitionRow,
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_requisition(&self.pool, requisition).await
    }

    pub async fn create_requisitions(
        &self,
        requisitions: &[database::schema::RequisitionRow],
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_requisitions(&self.pool, requisitions).await
    }

    pub async fn create_requisition_line(
        &self,
        requisition_line: &database::schema::RequisitionLineRow,
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_requisition_line(&self.pool, requisition_line).await
    }

    pub async fn create_requisition_lines(
        &self,
        requisition_lines: &[database::schema::RequisitionLineRow],
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_requisition_lines(&self.pool, requisition_lines).await
    }

    pub async fn create_transact(
        &self,
        transact: &database::schema::TransactRow,
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_transact(&self.pool, transact).await
    }

    pub async fn create_transacts(
        &self,
        transacts: &[database::schema::TransactRow],
    ) -> Result<(), sqlx::Error> {
        database::queries::insert_transacts(&self.pool, transacts).await
    }

    #[allow(dead_code)]
    pub async fn get_user_account_by_id(
        &self,
        id: &str,
    ) -> Result<database::schema::UserAccountRow, sqlx::Error> {
        database::queries::select_user_account_by_id(&self.pool, id).await
    }

    pub async fn get_store_by_id(
        &self,
        id: &str,
    ) -> Result<database::schema::StoreRow, sqlx::Error> {
        database::queries::select_store_by_id(&self.pool, id).await
    }

    pub async fn get_name_by_id(&self, id: &str) -> Result<database::schema::NameRow, sqlx::Error> {
        database::queries::select_name_by_id(&self.pool, id).await
    }

    pub async fn get_item_by_id(&self, id: &str) -> Result<database::schema::ItemRow, sqlx::Error> {
        database::queries::select_item_by_id(&self.pool, id).await
    }

    pub async fn get_item_line_by_id(
        &self,
        id: &str,
    ) -> Result<database::schema::ItemLineRow, sqlx::Error> {
        database::queries::select_item_line_by_id(&self.pool, id).await
    }

    pub async fn get_requisition_by_id(
        &self,
        id: &str,
    ) -> Result<database::schema::RequisitionRow, sqlx::Error> {
        database::queries::select_requisition_by_id(&self.pool, id).await
    }

    #[allow(dead_code)]
    pub async fn get_requisition_line_by_id(
        &self,
        id: &str,
    ) -> Result<database::schema::RequisitionLineRow, sqlx::Error> {
        database::queries::select_requisition_line_by_id(&self.pool, id).await
    }

    pub async fn get_requisition_lines_by_requisition_id(
        &self,
        requisition_id: &str,
    ) -> Result<Vec<database::schema::RequisitionLineRow>, sqlx::Error> {
        database::queries::select_requisition_lines_by_requisition_id(&self.pool, requisition_id)
            .await
    }

    #[allow(dead_code)]
    pub async fn get_transact_by_id(
        &self,
        id: &str,
    ) -> Result<database::schema::TransactRow, sqlx::Error> {
        database::queries::select_transact_by_id(&self.pool, id).await
    }

    #[allow(dead_code)]
    pub async fn get_customer_invoices_by_name_id(
        &self,
        name_id: &str,
    ) -> Result<Vec<database::schema::TransactRow>, sqlx::Error> {
        database::queries::select_customer_invoices_by_name_id(&self.pool, name_id).await
    }

    #[allow(dead_code)]
    pub async fn get_customer_invoices_by_store_id(
        &self,
        store_id: &str,
    ) -> Result<Vec<database::schema::TransactRow>, sqlx::Error> {
        database::queries::select_customer_invoices_by_store_id(&self.pool, store_id).await
    }

    #[allow(dead_code)]
    pub async fn get_transact_line_by_id(
        &self,
        id: &str,
    ) -> Result<database::schema::TransactLineRow, sqlx::Error> {
        database::queries::select_transact_line_by_id(&self.pool, id).await
    }

    #[allow(dead_code)]
    pub async fn get_transact_lines_by_transact_id(
        &self,
        transact_id: &str,
    ) -> Result<Vec<database::schema::TransactLineRow>, sqlx::Error> {
        database::queries::select_transact_lines_by_transact_id(&self.pool, transact_id).await
    }
}
