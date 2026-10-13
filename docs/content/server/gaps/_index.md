+++
title = "Asset Catalogue"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

This folder contains setup functions and helper scripts for GAPS functionality.

WARNING: Before running any of these scripts, make sure you have a backup of your 4d and postgres (openmsupply central) databases.

## Asset Catalogue

The `create_catalogue_migration_script` wasn't written to be re-run it generates new IDs for the assets each time it is run.
Next time we need to use it will probably need to adapt it to re-use existing ids where possible?
It creates asset_catalogue_items as well as asset classes, and categories and types.
Based on the pqs_catalogue.csv file, this was exported from a spreadsheet in google drive.

The `pqs_catalogue_properties.py` script, used the same data and updated the asset_catalogue_items with the properties based on their PQS Catalogue Code.
This one is more re-usable...

### Refreshing the WHO PQS catalogue

`refresh_who_pqs_catalogue.py` is the script to use for later refreshes. It was first used in October 2026 (#1285).
It compares the WHO PQS CCE master data workbook with the catalogue a database already holds and writes:

- a migration fragment that adds the products WHO have prequalified since the last refresh and moves the products WHO no longer list, or have suspended, to the `WHO PQS (withdrawn)` sub-catalogue. Nothing is deleted, because withdrawn equipment is still installed and in service.
- a CSV listing every change, with the reason each type was chosen.

```bash
python3 refresh_who_pqs_catalogue.py \
    --who who_pqs_catalogue.csv \
    --db path/to/an/omsupply-database.sqlite \
    --migration ../../repository/src/migrations/<version>/refresh_who_pqs_catalogue.rs \
    --summary who_pqs_catalogue_changes.csv
```

`--who` is a CSV export of the workbook's "WHO PQS catalogue database" sheet. `--db` can be any SQLite database at the current version; the script only reads its catalogue.
Ids are derived from the catalogue code, so running the script again gives the same ids.
WHO's feed doesn't give every product one of our types, and it has some mis-entered values. The script keeps the type decisions, manufacturer spellings and value corrections in tables at the top of the file. Check those tables first when a new export brings products the script can't place.
Before a second refresh, change the fragment's identifier and the target file name: a migration fragment only runs once.

## Items

WARNING: Ideally when importing this data access to the Open-mSupply Central server should be blocked from remote sites to avoid an issue with items not being available on the remote site when they download item variant.
AT THE LEAST, WE SHOULD SYNC OMS Central AS SOON AS POSSIBLE AFTER RUNNING THIS SCRIPT.

For GAPS, we have exported a csv file that creates, items, item_variants, packaging_variants, and a few other related things to pre-populate a database with GAPS related vaccine data.
It's expected that we'll run this import script once to kick start setup of a new GAPS database, NOTE: it might make sense to modify or filter the data before importing into a running system!

To run this script, you need python3.
If that's installed you should be able to run the script with the following command:

```bash
python3 gaps_item_inserts.py
```

This will create a new insert script in the generated directory.

Before running it, you'll want to make sure you've downloaded the latest version of the vaccine database from
https://docs.google.com/spreadsheets/d/1H_5_GMNdSN6_eLlRqZ7z4_3gx9spShwvb1NtLBrMEjQ
using the File -> Download -> Comma Separated Values option.

You'll need to save it as `gaps_item_variants.csv` in the items directory.

NOTE: Currently these inserts can be re-run but because we are saving the generated ids. However the insert statements use the `ON CONFLICT DO NOTHING` clause which means they won't actually update any existing records when run. In the future we might want to explicitly update particular fields we'll need to modify the script to do that.

NOTE: The sql output is designed to run on Postgres only, and only from the Open-mSupply Central server. Don't run it on a remote site!
