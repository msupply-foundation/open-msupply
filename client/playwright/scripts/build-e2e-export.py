#!/usr/bin/env python3
"""Build server/data/e2e (export.json + users.txt) from a captured sync buffer.

The source database is a scratch remote that was initialised as a V7 site
against the demo central (see TESTIDS.md / the FE-rewrite test plan for the
capture recipe). Its sync_buffer holds every record the central sent, already
in v7 wire shape — this script re-emits them as an `initialise-from-export`
file and injects the rows that don't come through a v7 pull (user_store_join,
user_permission), exactly the way the auth-flow fixture in
open-msupply-frontend#71 does.

Usage:
  python3 build-e2e-export.py [--db oms_e2e_capture] [--port 5433] [--out ../../server/data/e2e]

Requires psql on PATH and superuser access to the scratch DB (read-only use).
"""

import argparse
import json
import pathlib
import subprocess

GRY_STORE_ID = '80004C94067A4CE5A34FC343EB1B4306'
ADMIN_USER_ID = '0763E2E3053D4C478E1E6B6B03FEC207'
SITE_ID = 900
USERS_TXT = 'Admin:pass'
# Fixed stamp so re-runs against the same capture produce identical output.
INJECT_STAMP = '2026-07-09T00:00:00'

BUFFER_QUERY = """
SELECT row_to_json(t) FROM (
  SELECT cursor, record_id, received_datetime, table_name, action, data,
         sync_version, app_version, source_site_id, store_id,
         transfer_store_id, patient_id, reference_id
  FROM sync_buffer ORDER BY cursor
) t
"""

# DB representation -> SyncBufferRow serde representation
ACTION_MAP = {'UPSERT': 'Upsert', 'DELETE': 'Delete', 'MERGE': 'Merge'}


def buffer_row(cursor, record_id, received, table, data, source_site_id,
               action='Upsert', store_id=None, transfer_store_id=None,
               patient_id=None):
    return {
        'cursor': cursor,
        'record_id': record_id,
        'received_datetime': received,
        'integration_started_datetime': None,
        'integration_datetime': None,
        'integration_error': None,
        'integration_result': None,
        'table_name': table,
        'action': action,
        'data': data,
        'sync_version': 'V7',
        'app_version': None,
        'source_site_id': source_site_id,
        'store_id': store_id,
        'transfer_store_id': transfer_store_id,
        'patient_id': patient_id,
        'reference_id': None,
        'is_integrated': False,
    }


# PermissionType::known_iter() from server/repository/src/db_diesel/
# user_permission_row.rs — the FE gates buttons on the login user's
# permission list, so Admin gets the full set (as a real admin would have).
ALL_PERMISSIONS = [
    'ServerAdmin', 'StoreAccess', 'LocationMutate', 'SensorMutate',
    'SensorQuery', 'TemperatureBreachQuery', 'TemperatureLogQuery',
    'StockLineQuery', 'StockLineMutate', 'CreateRepack', 'StocktakeQuery',
    'StocktakeMutate', 'InventoryAdjustmentMutate', 'RequisitionQuery',
    'RequisitionMutate', 'RequisitionSend', 'RequisitionCreateOutboundShipment',
    'RnrFormQuery', 'RnrFormMutate', 'OutboundShipmentQuery',
    'OutboundShipmentMutate', 'InboundShipmentQuery', 'InboundShipmentMutate',
    'InboundShipmentVerify', 'SupplierReturnQuery', 'SupplierReturnMutate',
    'CustomerReturnQuery', 'CustomerReturnMutate', 'PrescriptionQuery',
    'PrescriptionMutate', 'CancelFinalisedInvoices', 'PurchaseOrderQuery',
    'PurchaseOrderMutate', 'PurchaseOrderAuthorise', 'PurchaseOrderFinalise',
    'InboundShipmentExternalQuery', 'InboundShipmentExternalMutate',
    'InboundShipmentExternalVerify', 'InboundShipmentExternalAuthorise',
    'Report', 'LogQuery', 'ItemMutate', 'ItemNamesCodesAndUnitsMutate',
    'PatientQuery', 'PatientMutate', 'DocumentQuery', 'DocumentMutate',
    'ColdChainApi', 'AssetQuery', 'AssetMutate', 'AssetMutateViaDataMatrix',
    'AssetCatalogueItemMutate', 'AssetStatusMutate', 'NamePropertiesMutate',
    'EditCentralData', 'ViewAndEditVvmStatus', 'MutateClinician',
]


def injected_rows(next_cursor):
    """Rows a v7 pull doesn't deliver: login wiring for Admin on GRY."""
    rows = [
        ('user_store_join', 'e2e_usj_admin_gry', {
            'id': 'e2e_usj_admin_gry',
            'user_id': ADMIN_USER_ID,
            'store_id': GRY_STORE_ID,
            'is_default': True,
        }),
    ]
    # user_permission.store_id is NOT NULL — even ServerAdmin is store-scoped here.
    rows += [
        ('user_permission', f'e2e_perm_admin_{perm}', {
            'id': f'e2e_perm_admin_{perm}',
            'user_id': ADMIN_USER_ID,
            'store_id': GRY_STORE_ID,
            'permission': perm,
            'context_id': None,
        })
        for perm in ALL_PERMISSIONS
    ]
    return [
        # v7 validation requires a store_id on the buffer row itself, so
        # stamp them all with GRY.
        buffer_row(next_cursor + i, record_id, INJECT_STAMP, table, data,
                   source_site_id=6,
                   store_id=GRY_STORE_ID)
        for i, (table, record_id, data) in enumerate(rows)
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--db', default='oms_e2e_capture')
    ap.add_argument('--port', default='5433')
    ap.add_argument('--out', default=str(pathlib.Path(__file__).resolve()
                                         .parents[3] / 'server/data/e2e'))
    args = ap.parse_args()

    raw = subprocess.run(
        ['psql', '-h', 'localhost', '-p', args.port, '-U', 'postgres',
         '-d', args.db, '-Atc', BUFFER_QUERY],
        env={'PGPASSWORD': 'password', 'PATH': '/Applications/Postgres.app/Contents/Versions/latest/bin:/usr/bin:/bin'},
        capture_output=True, text=True, check=True,
    ).stdout

    rows = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        rows.append(buffer_row(
            cursor=r['cursor'],
            record_id=r['record_id'],
            received=r['received_datetime'],
            table=r['table_name'],
            data=json.loads(r['data']),
            source_site_id=r['source_site_id'],
            action=ACTION_MAP[r['action']],
            store_id=r['store_id'],
            transfer_store_id=r['transfer_store_id'],
            patient_id=r['patient_id'],
        ))

    next_cursor = max(r['cursor'] for r in rows) + 1
    rows.extend(injected_rows(next_cursor))

    out_dir = pathlib.Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    export = {
        'sync_buffer_rows': rows,
        'users': [],
        'site_id': SITE_ID,
        # Central site id the v7 rows are stamped with (source_site_id) —
        # tells initialise-from-export to run the v7 integration path.
        'central_site_id': 6,
    }
    (out_dir / 'export.json').write_text(json.dumps(export, indent=1) + '\n')
    (out_dir / 'users.txt').write_text(USERS_TXT)

    tables = {}
    for r in rows:
        tables[r['table_name']] = tables.get(r['table_name'], 0) + 1
    print(f"wrote {out_dir}/export.json: {len(rows)} rows, site_id {SITE_ID}")
    print('tables:', json.dumps(tables, indent=0, sort_keys=True))


if __name__ == '__main__':
    main()
