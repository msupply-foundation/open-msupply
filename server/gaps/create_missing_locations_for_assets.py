#!/usr/bin/env python3
"""
This python script creates missing locations for assets in the postgres database.
It will create asset_internal_location records for assets that do not have one,
and if they don't have one, a location will also be created to match.
This will all only affect a single store, as specified by the script arguments/environment variables.

Any newly created records will have changelog entries created for them.

DEPENDENCIES:
    - Python 3.6 or higher
    - psycopg2 library

INSTALLATION:

    Windows:
        1. Install Python from https://www.python.org/downloads/ (ensure "Add Python to PATH" is checked)
        2. Open Command Prompt or PowerShell
        3. Install psycopg2:
           pip install psycopg2-binary
        
        Note: If you encounter issues, you may need to install Visual C++ Build Tools from:
        https://visualstudio.microsoft.com/visual-cpp-build-tools/

    macOS/Linux:
        pip install psycopg2-binary
        
        Or if you prefer to build from source:
        pip install psycopg2

USAGE:
    python gaps/create_missing_locations_for_assets.py --help
    
    # Dry run to preview changes
    python gaps/create_missing_locations_for_assets.py --dry-run
    
    # Process all assets
    python gaps/create_missing_locations_for_assets.py --host localhost --database omsupply --user postgres --password yourpass
    
    # Process only a specific store
    python gaps/create_missing_locations_for_assets.py --store-id "store123"
"""

import psycopg2
import argparse
import os
import sys
from uuid import uuid4
from datetime import datetime


def get_db_connection(host, port, database, user, password):
    """Establish connection to PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)


def get_assets_without_location(cursor, store_id=None):
    """Get all assets that don't have an asset_internal_location record."""
    query = """
        SELECT a.id, a.store_id, a.asset_number
        FROM asset a
        LEFT JOIN asset_internal_location ail ON a.id = ail.asset_id
        WHERE ail.id IS NULL
        AND a.deleted_datetime IS NULL
    """
    params = []
    
    if store_id:
        query += " AND a.store_id = %s"
        params.append(store_id)
    
    cursor.execute(query, params)
    return cursor.fetchall()


def create_location(cursor, store_id, asset_number):
    """Create a new location record for an asset."""
    location_id = str(uuid4())
    location_name = asset_number if asset_number else "Asset Location"
    location_code = asset_number if asset_number else location_id[:8]
    
    query = """
        INSERT INTO location (id, name, code, on_hold, store_id, location_type_id, volume)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(query, (
        location_id,
        location_name,
        location_code,
        False,
        store_id,
        None,
        0.0
    ))
    
    return location_id


def create_asset_internal_location(cursor, asset_id, location_id):
    """Create an asset_internal_location record linking asset to location."""
    internal_location_id = str(uuid4())
    
    query = """
        INSERT INTO asset_internal_location (id, asset_id, location_id)
        VALUES (%s, %s, %s)
    """
    cursor.execute(query, (internal_location_id, asset_id, location_id))
    
    return internal_location_id


def create_changelog_entry(cursor, table_name, record_id, store_id):
    """Create a changelog entry for the created record."""
    query = """
        INSERT INTO changelog (record_id, table_name, row_action, store_id)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(query, (record_id, table_name, 'UPSERT', store_id))


def process_assets(conn, store_id=None, dry_run=False):
    """Process all assets without locations and create necessary records."""
    cursor = conn.cursor()
    
    # Get assets without locations
    assets = get_assets_without_location(cursor, store_id)
    
    if not assets:
        print("No assets found without locations.")
        return
    
    print(f"Found {len(assets)} asset(s) without locations.")
    
    created_count = 0
    for asset_id, asset_store_id, asset_number in assets:
        try:
            print(f"\nProcessing asset: {asset_id} (store: {asset_store_id}, number: {asset_number})")
            
            if dry_run:
                print("  [DRY RUN] Would create location and asset_internal_location")
                continue
            
            # Create location
            location_id = create_location(cursor, asset_store_id, asset_number)
            print(f"  Created location: {location_id}")
            
            # Create changelog for location
            create_changelog_entry(cursor, 'location', location_id, asset_store_id)
            print(f"  Created changelog entry for location")
            
            # Create asset_internal_location
            internal_location_id = create_asset_internal_location(cursor, asset_id, location_id)
            print(f"  Created asset_internal_location: {internal_location_id}")
            
            # Create changelog for asset_internal_location
            create_changelog_entry(cursor, 'asset_internal_location', internal_location_id, asset_store_id)
            print(f"  Created changelog entry for asset_internal_location")
            
            created_count += 1
            
        except Exception as e:
            print(f"  Error processing asset {asset_id}: {e}")
            conn.rollback()
            continue
    
    if not dry_run:
        conn.commit()
        print(f"\n✓ Successfully processed {created_count} asset(s).")
    else:
        print(f"\n[DRY RUN] Would have processed {len(assets)} asset(s).")
    
    cursor.close()


def main():
    parser = argparse.ArgumentParser(
        description="Create missing locations for assets in PostgreSQL database"
    )
    parser.add_argument(
        "--host",
        default=os.getenv("DB_HOST", "localhost"),
        help="Database host (default: localhost or DB_HOST env var)"
    )
    parser.add_argument(
        "--port",
        default=os.getenv("DB_PORT", "5432"),
        help="Database port (default: 5432 or DB_PORT env var)"
    )
    parser.add_argument(
        "--database",
        default=os.getenv("DB_NAME", "omsupply"),
        help="Database name (default: postgres or DB_NAME env var)"
    )
    parser.add_argument(
        "--user",
        default=os.getenv("DB_USER", "postgres"),
        help="Database user (default: postgres or DB_USER env var)"
    )
    parser.add_argument(
        "--password",
        default=os.getenv("DB_PASSWORD", ""),
        help="Database password (default: empty or DB_PASSWORD env var)"
    )
    parser.add_argument(
        "--store-id",
        help="Process only assets from this store (optional)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created without making changes"
    )
    
    args = parser.parse_args()

    # check if all required args are provided

    
    
    print("Connecting to database...")
    conn = get_db_connection(
        args.host,
        args.port,
        args.database,
        args.user,
        args.password
    )
    
    try:
        process_assets(conn, args.store_id, args.dry_run)
    finally:
        conn.close()
        print("\nDatabase connection closed.")


if __name__ == "__main__":
    main()
