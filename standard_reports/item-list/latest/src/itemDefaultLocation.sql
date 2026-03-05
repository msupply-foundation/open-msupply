SELECT
    item.id AS item_id,
    location.code AS location_name
FROM item
INNER JOIN item_link ON item.id = item_link.item_id
INNER JOIN item_store_join ON item_store_join.item_link_id = item_link.id
INNER JOIN location ON location.id = item_store_join.default_location_id
WHERE item_store_join.store_id = $storeId
  AND item_store_join.default_location_id IS NOT NULL
