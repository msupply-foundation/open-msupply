#[cfg(test)]
mod tests {
    use crate::sync::test::integration::omsupply_central::{
        pack_variant::PackVariantTester, test_omsupply_central_records,
    };

    #[actix_rt::test]
    async fn integration_sync_omsupply_central_sync_pack_variant() {
        test_omsupply_central_records("pack_variant", &PackVariantTester).await;
    }
}
