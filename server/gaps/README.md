This folder contains setup functions and helper scripts for GAPS functionality.

## Asset Catalogue

The `create_catalogue_migration_script` wasn't written to be re-run it generates new IDs for the assets each time it is run.
Next time we need to use it will probably need to adapt it to re-use existing ids where possible?
It creates asset_catalogue_items as well asset, and categories and types.
Based on the pqs_catalogue.csv file, this was exported from a spreadsheet in google drive.

The `pqs_catalogue_properties.py` script, used the same data and updated the asset_catalogue_items with the properties based on their PQS Catalogue Code.
This one is more re-usable...

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
