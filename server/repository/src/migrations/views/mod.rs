use crate::{migrations::sql, StorageConnection};

pub(crate) fn drop_views(connection: &StorageConnection) -> anyhow::Result<()> {
    log::info!("Dropping database views...");
    sql!(
        connection,
        r#"
      DROP VIEW IF EXISTS invoice_stats;
      DROP VIEW IF EXISTS consumption;
      DROP VIEW IF EXISTS replenishment;
      DROP VIEW IF EXISTS adjustments;
      DROP VIEW IF EXISTS stock_movement;
      DROP VIEW IF EXISTS outbound_shipment_stock_movement;
      DROP VIEW IF EXISTS inbound_shipment_stock_movement;
      DROP VIEW IF EXISTS inventory_adjustment_stock_movement;
      DROP VIEW IF EXISTS invoice_line_stock_movement;
      DROP VIEW IF EXISTS stock_on_hand;
      DROP VIEW IF EXISTS changelog_deduped;
      DROP VIEW IF EXISTS latest_document;
      DROP VIEW IF EXISTS contact_trace_name_link_view;
      DROP VIEW IF EXISTS latest_asset_log;
      DROP VIEW IF EXISTS report_encounter;
      DROP VIEW IF EXISTS report_patient;
      DROP VIEW IF EXISTS report_program_enrolment;
      DROP VIEW IF EXISTS report_program_event;
      DROP VIEW IF EXISTS report_store;
      DROP VIEW IF EXISTS report_document;
      DROP VIEW IF EXISTS requisitions_in_period;
      DROP VIEW IF EXISTS store_items;
    "#
    )?;

    Ok(())
}

pub(crate) fn rebuild_views(connection: &StorageConnection) -> anyhow::Result<()> {
    log::info!("Re-creating database views...");

    let absolute = if cfg!(feature = "postgres") {
        "@"
    } else {
        "abs"
    };

    sql!(
        connection,
        r#"
  CREATE VIEW invoice_line_stock_movement AS 
    SELECT
        invoice_line.id,
        invoice_line.invoice_id,
        invoice_line.item_name,
        invoice_line.item_code,
        invoice_line.stock_line_id,
        invoice_line.location_id,
        invoice_line.batch,
        invoice_line.expiry_date,
        invoice_line.cost_price_per_pack,
        invoice_line.sell_price_per_pack,
        invoice_line.total_before_tax,
        invoice_line.total_after_tax,
        invoice_line.tax_percentage,
        invoice_line.number_of_packs,
        invoice_line.pack_size,
        invoice_line.note,
        invoice_line.type,
        invoice_line.inventory_adjustment_reason_id,
        invoice_line.foreign_currency_price_before_tax,
        invoice_line.item_link_id,
        invoice_line.return_reason_id,
        item_link.item_id AS item_id,
        CASE
            WHEN "type" = 'STOCK_IN' THEN (number_of_packs * pack_size)
            WHEN "type" = 'STOCK_OUT' THEN (number_of_packs * pack_size) * -1
        END AS quantity_movement
    FROM
        invoice_line
        JOIN item_link ON item_link.id = invoice_line.item_link_id
    WHERE
        number_of_packs > 0
        AND "type" IN ('STOCK_IN', 'STOCK_OUT');

  -- https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/aggregator_stockMovement.4dm
  -- TODO are all of sc, ci, si type transactions synced, and are all of the dates set correctly ?
  CREATE VIEW outbound_shipment_stock_movement AS
    SELECT 
        'n/a' as id,
        quantity_movement as quantity,
        item_id,
        store_id,
        picked_datetime as datetime
    FROM invoice_line_stock_movement 
    JOIN invoice
        ON invoice_line_stock_movement.invoice_id = invoice.id
    WHERE invoice.type = 'OUTBOUND_SHIPMENT' 
        AND picked_datetime IS NOT NULL;
                  
  CREATE VIEW inbound_shipment_stock_movement AS
    SELECT 
        'n/a' as id,
        quantity_movement as quantity,
        item_id,
        store_id,
        delivered_datetime as datetime
    FROM invoice_line_stock_movement 
    JOIN invoice
        ON invoice_line_stock_movement.invoice_id = invoice.id
    WHERE invoice.type = 'INBOUND_SHIPMENT' 
        AND delivered_datetime IS NOT NULL;
                    
  CREATE VIEW inventory_adjustment_stock_movement AS
    SELECT
        'n/a' as id,
        quantity_movement as quantity,
        item_id,
        store_id,
        verified_datetime as datetime
    FROM invoice_line_stock_movement
    JOIN invoice
        ON invoice_line_stock_movement.invoice_id = invoice.id
    WHERE invoice.type IN ('INVENTORY_REDUCTION', 'INVENTORY_ADDITION') 
        AND verified_datetime IS NOT NULL;

  CREATE VIEW stock_movement AS
    WITH all_movements AS (
      SELECT
        invoice_line_stock_movement.id AS id,
        quantity_movement AS quantity,
        item_link_id AS item_id,
        store_id,
        CASE WHEN invoice.type IN (
            'OUTBOUND_SHIPMENT', 'SUPPLIER_RETURN',
            'PRESCRIPTION'
        ) THEN picked_datetime
                    WHEN invoice.type IN (
            'INBOUND_SHIPMENT', 'CUSTOMER_RETURN'
        ) THEN delivered_datetime
                    WHEN invoice.type IN (
            'INVENTORY_ADDITION', 'INVENTORY_REDUCTION', 'REPACK'
        ) THEN verified_datetime
            END AS datetime,
        name,
        invoice.type AS invoice_type,
        invoice.invoice_number AS invoice_number,
        inventory_adjustment_reason.reason as inventory_adjustment_reason,
        return_reason.reason as return_reason,
        stock_line_id
    FROM
        invoice_line_stock_movement
        LEFT JOIN inventory_adjustment_reason ON invoice_line_stock_movement.inventory_adjustment_reason_id = inventory_adjustment_reason.id
        LEFT JOIN return_reason ON invoice_line_stock_movement.return_reason_id = return_reason.id
        JOIN invoice ON invoice.id = invoice_line_stock_movement.invoice_id
        JOIN name_link ON invoice.name_link_id = name_link.id
        JOIN name ON name_link.name_id = name.id
    )
    SELECT * FROM all_movements
    WHERE datetime IS NOT NULL;

  CREATE VIEW replenishment AS
    SELECT
        'n/a' as id,
        items_and_stores.item_id AS item_id,
        items_and_stores.store_id AS store_id,
        {absolute}(COALESCE(stock_movement.quantity, 0)) AS quantity,
        date(stock_movement.datetime) AS date
    FROM
        (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
    LEFT OUTER JOIN stock_movement
        ON stock_movement.item_id = items_and_stores.item_id
            AND stock_movement.store_id = items_and_stores.store_id
    WHERE invoice_type='INBOUND_SHIPMENT';

  CREATE VIEW adjustments AS
    SELECT
        'n/a' as id,
        items_and_stores.item_id AS item_id,
        items_and_stores.store_id AS store_id,
        stock_movement.quantity AS quantity,
        date(stock_movement.datetime) AS date
    FROM
        (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
    LEFT OUTER JOIN stock_movement
        ON stock_movement.item_id = items_and_stores.item_id
            AND stock_movement.store_id = items_and_stores.store_id
    WHERE invoice_type='CUSTOMER_RETURN'
      OR invoice_type='SUPPLIER_RETURN'
      OR invoice_type='INVENTORY_ADDITION'
      OR invoice_type='INVENTORY_REDUCTION';

          
  -- https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/aggregator_stockConsumption.4dm
  -- TODO sc type ?
  CREATE VIEW consumption AS
    SELECT
        'n/a' as id,
        items_and_stores.item_id AS item_id,
        items_and_stores.store_id AS store_id,
        {absolute}(COALESCE(stock_movement.quantity, 0)) AS quantity,
        date(stock_movement.datetime) AS date
    FROM
        (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
    LEFT OUTER JOIN stock_movement
        ON stock_movement.item_id = items_and_stores.item_id
            AND stock_movement.store_id = items_and_stores.store_id
    WHERE invoice_type='OUTBOUND_SHIPMENT' OR invoice_type='PRESCRIPTION';

  CREATE VIEW store_items AS
    SELECT i.id as item_id, sl.store_id, sl.pack_size, sl.available_number_of_packs, sl.total_number_of_packs
    FROM
      item i
      LEFT JOIN item_link il ON il.item_id = i.id
      LEFT JOIN stock_line sl ON sl.item_link_id = il.id
      LEFT JOIN store s ON s.id = sl.store_id;

  CREATE VIEW stock_on_hand AS
    SELECT
      'n/a' AS id,
      items_and_stores.item_id AS item_id,
      items_and_stores.item_name AS item_name,
      items_and_stores.store_id AS store_id,
      COALESCE(stock.available_stock_on_hand, 0) AS available_stock_on_hand,
      COALESCE(stock.total_stock_on_hand, 0) AS total_stock_on_hand
    FROM
      (
        SELECT
          item.id AS item_id,
          item.name AS item_name,
          store.id AS store_id
        FROM
          item,
          store
      ) AS items_and_stores
      LEFT OUTER JOIN (
        SELECT
          item_id,
          store_id,
          SUM(pack_size * available_number_of_packs) AS available_stock_on_hand,
          SUM(pack_size * total_number_of_packs) AS total_stock_on_hand
        FROM
          store_items
        WHERE
          store_items.available_number_of_packs > 0 OR store_items.total_number_of_packs > 0
        GROUP BY
          item_id,
          store_id
      ) AS stock ON stock.item_id = items_and_stores.item_id
      AND stock.store_id = items_and_stores.store_id;

    -- View of the changelog that only contains the most recent changes to a row, i.e. previous row
    -- edits are removed.
    -- Note, an insert + delete will show up as an orphaned delete.
  CREATE VIEW changelog_deduped AS
    SELECT c.cursor,
        c.table_name,
        c.record_id,
        c.row_action,
        c.name_link_id,
        c.store_id,
        c.is_sync_update,
        c.source_site_id
    FROM (
        SELECT record_id, MAX(cursor) AS max_cursor
        FROM changelog
        GROUP BY record_id
    ) grouped
    INNER JOIN changelog c
        ON c.record_id = grouped.record_id AND c.cursor = grouped.max_cursor
    ORDER BY c.cursor;

  CREATE VIEW latest_document
    AS
        SELECT d.*
        FROM (
        SELECT name, MAX(datetime) AS datetime
            FROM document
            GROUP BY name
    ) grouped
    INNER JOIN document d
    ON d.name = grouped.name AND d.datetime = grouped.datetime;

  CREATE VIEW latest_asset_log AS
    SELECT al.id,
      al.asset_id,
      al.user_id,
      al.comment,
      al.type,
      al.log_datetime,
      al.status,            
      al.reason_id
    FROM (
      SELECT asset_id, MAX(log_datetime) AS latest_log_datetime
      FROM asset_log
      GROUP BY asset_id
    ) grouped
    INNER JOIN asset_log al
      ON al.asset_id = grouped.asset_id AND al.log_datetime = grouped.latest_log_datetime;

  -- This view contains the latest document versions
  CREATE VIEW report_document AS
    SELECT
        d.name,
        d.datetime,
        d.type,
        d.data,
        nl.name_id as owner_name_id
    FROM (
        SELECT name as doc_name, MAX(datetime) AS doc_time
        FROM document
        GROUP BY name
    ) grouped
    INNER JOIN document d ON d.name = grouped.doc_name AND d.datetime = grouped.doc_time
    LEFT JOIN name_link nl ON nl.id = d.owner_name_link_id
    WHERE d.status != 'DELETED';

  CREATE VIEW report_encounter AS
    SELECT
      encounter.id,
      encounter.created_datetime,
      encounter.start_datetime,
      encounter.end_datetime,
      encounter.status,
      encounter.store_id,
      nl.name_id as patient_id,
      encounter.document_type,
      doc.data as document_data
    FROM encounter
    LEFT JOIN name_link nl ON nl.id = encounter.patient_link_id
    LEFT JOIN report_document doc ON doc.name = encounter.document_name;

  CREATE VIEW report_store AS
    SELECT
        store.id,
        store.code,
        store.store_mode,
        store.logo,
        name.name
    FROM store
    JOIN name_link ON store.name_link_id = name_link.id
    JOIN name ON name_link.name_id = name.id;

  CREATE VIEW report_patient AS
    SELECT
        id,
        code,
        national_health_number AS code_2,
        first_name,
        last_name,
        gender,
        date_of_birth,
        address1,
        phone,
        date_of_death,
        is_deceased
    FROM name;

  CREATE VIEW report_program_event AS
    SELECT
        e.id,
        nl.name_id as patient_id,
        e.datetime,
        e.active_start_datetime,
        e.active_end_datetime,
        e.document_type,
        e.document_name,
        e.type,
        e.data
    FROM program_event e
    LEFT JOIN name_link nl ON nl.id = e.patient_link_id;

  CREATE VIEW report_program_enrolment AS
    SELECT
        program_enrolment.id,
        program_enrolment.document_type,
        program_enrolment.enrolment_datetime,
        program_enrolment.program_enrolment_id,
        program_enrolment.status,
        nl.name_id as patient_id,
        doc.data as document_data
    FROM program_enrolment
    LEFT JOIN name_link nl ON nl.id = program_enrolment.patient_link_id
    LEFT JOIN report_document doc ON doc.name = program_enrolment.document_name;


      CREATE VIEW requisitions_in_period AS
          SELECT 'n/a' as id, program_id, period_id, store_id, order_type, type, count(*) as count FROM requisition WHERE order_type IS NOT NULL
            GROUP BY 1,2,3,4,5,6;   
      "#,
    )?;

    if cfg!(not(feature = "postgres")) {
        sql!(
            connection,
            r#"
       CREATE VIEW invoice_stats AS
        SELECT
	        invoice_line.invoice_id,
            SUM(invoice_line.total_before_tax) AS total_before_tax,
	        SUM(invoice_line.total_after_tax) AS total_after_tax,
            (SUM(invoice_line.total_after_tax) / SUM(invoice_line.total_before_tax) - 1) * 100 AS tax_percentage,
            SUM(invoice_line.foreign_currency_price_before_tax) + (SUM(invoice_line.foreign_currency_price_before_tax) * COALESCE(invoice_line.tax_percentage, 0) / 100) AS foreign_currency_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
	        COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_before_tax,
	         COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_after_tax
        FROM
	        invoice_line
        GROUP BY
	        invoice_line.invoice_id;

    CREATE VIEW contact_trace_name_link_view AS
      SELECT 
        ct.id AS id,
        ct.program_id AS program_id,
        ct.document_id AS document_id,
        ct.datetime AS datetime,
        ct.contact_trace_id AS contact_trace_id,
        patient_name_link.name_id AS patient_id,
        contact_patient_name_link.name_id AS contact_patient_id,
        ct.first_name AS first_name,
        ct.last_name AS last_name,
        ct.gender AS gender,
        ct.date_of_birth AS date_of_birth,
        ct.store_id AS store_id,
        ct.relationship AS relationship
      FROM contact_trace ct
      INNER JOIN name_link as patient_name_link
        ON ct.patient_link_id = patient_name_link.id
      LEFT JOIN name_link as contact_patient_name_link
        ON ct.contact_patient_link_id = contact_patient_name_link.id;
      "#
        )?;
    }

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
              CREATE VIEW invoice_stats AS
        SELECT
	        invoice_line.invoice_id,
            SUM(invoice_line.total_before_tax) AS total_before_tax,
	        SUM(invoice_line.total_after_tax) AS total_after_tax,
            COALESCE((SUM(invoice_line.total_after_tax) / NULLIF(SUM(invoice_line.total_before_tax), 0) - 1), 0) * 100 AS tax_percentage,
            COALESCE(SUM(invoice_line.foreign_currency_price_before_tax), 0) + (COALESCE(SUM(invoice_line.foreign_currency_price_before_tax), 0) * (COALESCE((SUM(invoice_line.total_after_tax) / NULLIF(SUM(invoice_line.total_before_tax), 0) - 1), 0))) AS foreign_currency_total_after_tax,
            COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
	        COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_before_tax,
	         COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_after_tax
        FROM
	        invoice_line
        GROUP BY
	        invoice_line.invoice_id;

    CREATE VIEW contact_trace_name_link_view AS
      SELECT 
        ct.id AS id,
        ct.program_id AS program_id,
        ct.document_id AS document_id,
        ct.datetime AS datetime,
        ct.contact_trace_id AS contact_trace_id,
        patient_name_link.name_id AS patient_id,
        contact_patient_name_link.name_id AS contact_patient_id,
        ct.first_name AS first_name,
        ct.last_name AS last_name,
        ct.gender AS gender,
        CAST(ct.date_of_birth AS DATE) AS date_of_birth,
        ct.store_id AS store_id,
        ct.relationship AS relationship
      FROM contact_trace ct
      INNER JOIN name_link as patient_name_link
        ON ct.patient_link_id = patient_name_link.id
      LEFT JOIN name_link as contact_patient_name_link
        ON ct.contact_patient_link_id = contact_patient_name_link.id;
        "#
        )?;
    }

    Ok(())
}
