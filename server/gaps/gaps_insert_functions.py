
def changelog_stmt(record_id, table_name):
    # Thank you to whoever set the default value of cursor in ChangeLog to properly generate the next value!
    # nextval('changelog_cursor_seq'::regclass)
    return f"INSERT INTO changelog (record_id, table_name, row_action) VALUES ('{record_id}', '{table_name}', 'UPSERT');"


def upsert_item_stmt(item_id, row):
    item_name = row['VaccineType']
    item_code = row['VaccineTypeName']
    ven_category = "NOT_ASSIGNED"
    item_type = "STOCK"
    legacy_record = ""
    is_active = True
    is_vaccine = True
    vaccine_doses = 1 # default, the variants will have the actual dose count

    # Insert the item
    insert_statement = (f"INSERT INTO item (id, name, code, ven_category, type, legacy_record, is_active, is_vaccine, vaccine_doses, default_pack_size)"
                        f" VALUES ('{item_id}', '{item_name}', '{item_code}', '{ven_category}', '{item_type}', '{legacy_record}', '{is_active}', '{is_vaccine}', {vaccine_doses}, 1)"
                        f" ON CONFLICT DO NOTHING;") # For now we just won't update, so only new items will be inserted
    print(insert_statement)

    #Insert the changelog
    print(changelog_stmt(item_id, 'item'))

    return insert_statement

def upsert_dilluent_stmt(item_id, row):
    item_name = row['VaccineTypeName'] + " Diluent"
    item_code = row['VaccineTypeName'] + "_DILUENT"
    ven_category = "NOT_ASSIGNED"
    item_type = "STOCK"
    legacy_record = ""
    is_active = True
    is_vaccine = False
    vaccine_doses = 0

    # Insert the item
    insert_statement = (f"INSERT INTO item (id, name, code, ven_category, type, legacy_record, is_active, is_vaccine, vaccine_doses, default_pack_size)"
                        f" VALUES ('{item_id}', '{item_name}', '{item_code}', '{ven_category}', '{item_type}', '{legacy_record}', '{is_active}', '{is_vaccine}', {vaccine_doses}, 1)"
                        f" ON CONFLICT DO NOTHING;") # For now we just won't update, so only new items will be inserted
    print(insert_statement)

    #Insert the changelog
    print(changelog_stmt(item_id, 'item'))

    return insert_statement

def upsert_item_variant_stmt(item_variant_id, item_id, row):
    item_variant_name = row['VaccineTypeVariant']
    item_variant_code = row['PQSVaccineID']
    is_active = True
    vaccine_doses = row['DosesPerVial']
    vaccine_doses = int(vaccine_doses) if vaccine_doses else 1

    # Insert the item_variant
    insert_statement = (f"INSERT INTO item_variant "
                        "(id, name, item_link_id, cold_storage_type_id, doses_per_unit, manufacturer_link_id, deleted_datetime)"
                        f" VALUES ('{item_variant_id}', '{item_variant_name}', '{item_variant_code}', '{item_id}', '{is_active}', {vaccine_doses})"
                        f" ON CONFLICT DO NOTHING;") # For now we just won't update, so only new items will be inserted
    print(insert_statement)

    #Insert the changelog
    print(changelog_stmt(item_variant_id, 'item_variant'))

    return insert_statement