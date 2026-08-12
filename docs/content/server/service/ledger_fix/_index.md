+++
title = "Ledger Fix"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Ledger Fix

Due to migration from existing mSupply sites and omSupply bug we've had ledger discrepancies, which are:

- Where total movements of stock (invoice_lines) does not add up to current stock balance (stock_line)
- Where as any point in history, sum of invoice_lines as negative.

### Strategy to deal with ledger discrepancies

#### Prevent

Make it harder to implement things that will cause ledger discrepancy.

- Emphasise tests
- Service/repo structure with one point of entry for operations that affect stock

#### Fix and Notify

We understand that some ledger problems will sneak through (even with our best effort at prevention), to deal with affect of ledger discrepancies on users we will

- Implement a strategy of timely awareness of ledger discrepancies
- Strategy to fix ledger discrepancies in as much of a safe manner as possible

**The automated fixes were removed** (commit `5aba1886f9`). Nothing in the codebase repairs a ledger any more — what remains is detection and notification. The [States and Fixes](#states-and-fixes) taxonomy below is kept as reference: it is still the best guide to *why* a given stock line is broken, and each entry describes the repair that used to be attempted.

### Ledger check

`service::ledger_fix::ledger_check` is the single component that runs the discrepancy scan. It behaves differently by build profile, because the two audiences need opposite things:

| | Development build | Release build |
| --- | --- | --- |
| Interval | 30 seconds | Once a day |
| On finding a discrepancy | **Stops the server** | Logs, and writes a system log |

Stopping the server in development is deliberate — see [#12582](https://github.com/msupply-foundation/open-msupply/issues/12582). Ledger bugs are cheap to diagnose seconds after the request that caused them and very expensive months later; the bug fixed in [#12578](https://github.com/msupply-foundation/open-msupply/pull/12578) went undetected across four major releases.

The release-build system log (`SystemLogType::LedgerFixError`) syncs to omSupply central, and [#9552](https://github.com/msupply-foundation/open-msupply/issues/9552) builds a support-facing daily report from that stream — so the daily cadence and the log row are load-bearing.

It also runs once immediately after site initialisation, since legacy mSupply migration is the single richest source of discrepancies. Last execution is stored in the key value store, so a site that restarts more often than its interval still gets checked, and doesn't rescan on every boot. Scans are skipped while a sync is in progress (mid-integration states are legitimately inconsistent) and when the changelog cursor hasn't moved.

Everything is overridable via the `ledger_check` section of the server yaml — see `configuration/example.yaml`. In particular `warn_only: true` turns a development build into the release behaviour, which is what you want on a database restored from customer data, since those routinely carry pre-existing discrepancies and would otherwise refuse to run.

For tests, `service::test_helpers::assert_stock_line_ledger_consistent` asserts the same rule for a single stock line. Use it in tests that move stock around. It is deliberately per stock line rather than a blanket check — much of the shared mock data has pack counts with no matching movements and so is "broken" by this definition.

### Find Ledger Discrepancies

This operations should be quick and efficient, using partition sql introduced in stock_line/item ledger view, for each stock_line:

- Find any negative running balances
- Find any cases where final running balances does not add up to total quantity and total quantity is not available quantity + any stock that is reserved but not yet applied to total

### Fix Ledger discrepancies

> **Historical.** This describes the fix pipeline as it was before commit `5aba1886f9` removed it. No code does this today. Recover the implementations with `git show 5aba1886f9^:server/service/src/ledger_fix/fixes/<file>`.

Each stock line will go through a series of fixes based on know invalid 'states' of ledger. After each fix a ledger discrepancy check is performed, if ledger is not yet fixed the next fix is attempted.

### States and Fixes

In the order of execution (this order is important). The `state` of each entry is still an accurate description of a way a ledger can be broken, and is the most useful thing to read when diagnosing a discrepancy; the `fix` is what used to be attempted.

#### Delete - remove_unused_orphan_stock_lines

Legacy mSupply sync v1 sites had an edge case where the V1 API would create orphan stock lines for OMS sites if

1. Their customer invoice was in "confirmed" status
2. OMS had synced, generated a "picked" inbound shipment, and synced it back to central
3. Legacy users continued adding lines on their "confirmed" customer invoice - when synced to central, V1 sync would create trans_lines for the OMS inbound shipment (OMS should have been left to do this),
   and item_lines related to those trans_lines. This increases SOH before the inbound shipment is received/verified.
4. Legacy users finalise their customer invoice - OMS transfer processors drop all lines in their inbound shipment and regenerates them, loosing the FK from their invoice line to their stock line that was generated by OG. The stock line is now an orphan.

[Source of issue fixed in Legacy Central.](https://github.com/msupply-foundation/msupply/issues/17137)

If the legacy users don't finalise their confirmed invoices, the stock_lines remain related to the trans_lines that legacy central generated. Thus not orphans, this ledger fix won't touch them. `inventory_adjustment_to_balance` should apply.

Once OMS users finally do receive/verify their inbound shipment OMS will create the valid stock lines as intended by the system, doubling up on the already erroneously introduced stock. If this ledger fix has removed the stock line from legacy, chances are their SOH should be correct. Otherwise the users will probably need to stocktake to remove it.

If users have issued stock from the legacy stock line, we cannot delete the stock line and `inventory_adjustment_to_balance` should apply. If the stock line is deleted and users had already done a stocktake to reduced SOH and adjusted the valid stock line rather than the erroneous one, after ledger fix users will notice their SOH has decreased and will likely need to do stocktake to increase it again.

Any stocktake line that a user may have created regarding the orphan stockline will prevent this fix from applying.

`state` total and balance don't add up, available + reserved = total, the ID format is not OMS and the stock line has no related invoice lines

`fix` delete the stock line

#### Adjust historic incoming invoices - adjust_historic_incoming_invoices

We've found use cases where stock introduction after issue, all of them were with mSupply mobile or mSupply uuids.

`state` running balance is negative at some point in history, but current total adds up to available + reserved not picked and to final running balance.

`fix` backdate stock in invoices (with as little impact as possible)

#### Balance ledger with inventory adjustments - inventory_adjustment_to_balance

There are cases where total adds up to reserved not picked, but running balance doesn't not most of them where mSupply mobile or mSupply uuids but some were omSupply uuids (closer investigation of omSupply uuids showed that they were from ledger discrepancy caused by 'cancelled' prescriptions)

`state` final running balance is not total and total is available + reserved not picked, and stock line uuid is not omSupply

`fix` create inventory adjustment to balance final running balance with total, positive inventory adjustment is added to the very start of stock line ledger, negative inventory adjustment is added as far back as possible without causing negative historic ledger

#### Adjust total to match ledger - adjust_total_to_match_ledger

A case where available and reserved is the same as final running balance but total is not. Most of this looks like a ledger discrepancy issue caused by omSupply and mSupply sync interaction, as [per this issue](https://github.com/msupply-foundation/open-msupply/issues/8654).

`state` final running balance is available plus reserved not yet picked, total is not

`fix` adjust total to match available plus reserved not yet picked

#### Cancellations - fix_cancellations

We had a bug in omSupply where cancellations were not putting stock back into stock line, this since has been fixed, but we did find some use cases of this as ledger discrepancies.

`state` where available + reserved not picked + sum of cancelled prescriptions = final running and total + sum of cancelled prescriptions = final running balance

`fix` adjust total by sum of cancelled prescriptions and adjust available by sum of cancelled prescriptions

### Nothing matches - adjust_all_to_match_available

Some unknown use case where final running balance and total and available + reserve not picked are all different from each other, we found only 1 case of this in the data we looked at, which had 6k ledger discrepancies.

`state` available + reserved not picked is not total or running balance, total is not final running balance

`fix` adjust total to be available + reserved not picked and final running balance to be the same, use inventory adjustment method for final running balance as per 'inventory_adjustment_to_balance

## IMPORTANT

> **Historical**, as above — these caveats are why the fixes were removed, and why any future attempt to reinstate them needs to weigh them again.

Some changes will affect the user, we are trying to keep this to a minimum and most times ledger fixes will have an impact on just the historic reporting. However some times total is adjusted, user may see different in total for item from previous hour/day, in some case this will cause stock line to be 'resurrected', and in even a worse case it will be 'resurrected' but with all balance reserved, this will mean it will not be adjustable unless un-reserved(finding all outbound shipment where stock is reserved and removing stock from those or 'picking/shipping' those outbounds).

This is captured in carry over issue, alongside some improvements to existing logic + future goals

### Tips and Ticks

To force the check to run now on a release build, empty the key value store value for 'last ledger fix run' and restart. On a development build the interval is 30 seconds, so just wait.

A good way to investigate ledger fixes is to get a remote database, run a view to find ledger problems, export to excel and start investigating one line at a time with `stock_line_ledger` view. We also found that looking at activity log was helpful (at least in finding the double picked issue). Pay attention to stock_line_id uuids(), all caps = mSupply, lower case = mSupply mobile, the ones with dashes are omSupply.

See 'summary' docs in [this google drive folder](https://drive.google.com/drive/u/1/folders/1dh8hWZ0_GgKWnrf7ldRjAtgp5jg9ZyVi) for sql view, alongside excel files with those views and investigation details.
