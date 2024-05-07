use crate::StorageConnection;
#[cfg(not(feature = "postgres"))]
use diesel::prelude::*;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}

table! {
    changelog (id) {
        id -> Text,
        record_id -> Text,
        table_name -> Text,
        row_action -> Text,
    }
}

table! {
    barcode (id) {
        id -> Text,
        gtin -> Text,
        item_id -> Text,
    }
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Update changelogs for barcodes
    use self::barcode::dsl as barcode_dsl;
    use self::changelog::dsl as changelog_dsl;

    let barcode_ids = barcode_dsl::barcode
        .select(barcode::id)
        .load::<String>(connection.lock().connection())?;

    // Delete all changelogs for table barcode where record_id is not found
    // in barcode table and changelog is of upsert type
    diesel::delete(changelog_dsl::changelog)
        .filter(
            changelog_dsl::table_name
                .eq("barcode")
                .and(changelog_dsl::row_action.eq("UPSERT"))
                .and(changelog_dsl::record_id.ne_all(barcode_ids)),
        )
        .execute(connection.lock().connection())?;

    Ok(())
}

#[cfg(test)]
#[cfg(not(feature = "postgres"))]
#[actix_rt::test]
async fn migration_1_01_1_barcode_changelog() {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::RunQueryDsl;
    // For data migrations we want to insert data then do the migration, thus setup with version - 1
    // Then insert data and upgrade to this version

    let previous_version = v1_01_13::V1_01_13.version();
    let version = super::V1_01_14.version();

    // Migrate to version - 1
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_1_01_1_barcode_changelog_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    use barcode::dsl as barcode_dsl;
    use changelog::dsl as changelog_dsl;

    sql!(
        &connection,
        r#"
        INSERT INTO item 
        (id, name, code, default_pack_size, type, legacy_record) 
        VALUES 
        ('item', 'item', 'item', 1, 'STOCK', '');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO barcode 
        (id, gtin, item_id) 
        VALUES 
        ('barcode_1', 'gtin_1', 'item');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO barcode 
        (id, gtin, item_id) 
        VALUES 
        ('barcode_2', 'gtin_2', 'item');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO barcode 
        (id, gtin, item_id) 
        VALUES 
        ('barcode_3', 'gtin_3', 'item');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO barcode 
        (id, gtin, item_id) 
        VALUES 
        ('barcode_4', 'gtin_4', 'item');
    "#
    )
    .unwrap();

    // This one should remove barcode_3, as per: https://www.db-fiddle.com/f/izBry7rdXHZ2S37DNpAuZ9/1
    // this replicates upsert_one logic
    diesel::replace_into(barcode_dsl::barcode)
        .values((
            barcode_dsl::id.eq("barcode_5"),
            barcode_dsl::gtin.eq("gtin_3"),
            barcode_dsl::item_id.eq("item"),
        ))
        .execute(connection.lock().connection())
        .unwrap();

    let barcode_ids = barcode_dsl::barcode
        .select(barcode_dsl::id)
        .order_by(barcode_dsl::id.asc())
        .load::<String>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        barcode_ids,
        vec!["barcode_1", "barcode_2", "barcode_4", "barcode_5"]
    );
    // But barcode_3 would be kept in changelog
    // Check data
    let changelog_record_ids = changelog_dsl::changelog
        .select(changelog_dsl::record_id)
        .distinct()
        .filter(changelog_dsl::table_name.eq("barcode"))
        .order_by(changelog_dsl::record_id.asc())
        .load::<String>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        changelog_record_ids,
        vec![
            "barcode_1",
            "barcode_2",
            "barcode_3",
            "barcode_4",
            "barcode_5"
        ]
    );

    // Migrate to this version
    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);

    // Check data, barcode_3 should be removed from changelog
    let changelog_record_ids = changelog_dsl::changelog
        .select(changelog_dsl::record_id)
        .distinct()
        .filter(changelog_dsl::table_name.eq("barcode"))
        .order_by(changelog_dsl::record_id.asc())
        .load::<String>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        changelog_record_ids,
        vec!["barcode_1", "barcode_2", "barcode_4", "barcode_5"]
    )
}
