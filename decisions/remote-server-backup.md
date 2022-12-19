# Remote Server Backup

- *Date*: 2022-12-7
- *Deciders*: 
- *Status*: 
- *Outcome*: 
- *Related Material*: [Backup Issue](https://github.com/openmsupply/open-msupply/issues/767)

## Context

It's important to back up remote server data so that it can be restored in case of corruption/loss. This KDD is to discuss backup of remote server in syncrhonisation context.

In existing 4d mSupply, for remote servers, we have backup files and current journal file. There is no way to directly re-initialise remote desktop mSupply sites, there is a way to export initialisation data and create a new remote data file, but this process is quite slow and cumbersome, thus we mainly rely on local/dropbox backups. There have been cases where local backup restores for remote sites have caused inconsistencies in remote and central data, which in turn caused hard to solve issues (like ledger discrepancies)

### Wrongly Restored Example

* Wrong backup (not the latest)
* Forget to integrate journal
* Journal data corruption

### Data Issues

When remote data is not `in sync` with central data (i.e. older backup was used), we almost certainly have a ledger discrepancy that can persist and is hard to fix correctly. 

**Example:**

Consider that remote and central server data is synchronised, and we have the following ledger for stockline: stockline quantity = 10, transaction1 = +15, transaction2 = -2 transaction3 = -3. 15 - 2 - 3 = 10 thus ledger is correct. Now if remote server backup was restored not including transaction 3, stockline quantity would be 13, and any further transaction and syncrhonisation will create ledger discrepancy for this stockline on central server.

## Options

### Option 1 - Local backup

Local backup with journal

*Pros:*
- Can be restored easier with low bandwidth environment
- Reduce data loss if done correctly in cases where internet was not available and sync not possible

*Cons:*
- Harder to set up correctly and to maintain (for both sqlite and postgres)
- Larger disc space requirement 
- Risk of incorrect restore and being `out of sync`

### Option 2 - Backup via sync

Re initialise in case of data loss. We can deploy some strategies to improve this process in low bandwidth environment (i.e. restore backup on central server and send data file)

*Pros:*
- Reduced risk of incorrect restore
- No extra setup and maintenance needed

*Cons:*
- Can loose data if there was no internet for sync (or if we had sync errors)
- Challenging in low bandwidth environment
- Much slower for big data files

### Option 2 - Backup with Wal and Sync Realignment

Setting up postgres and sqlite to backup with journal (wal). And a mechanism to re-align data between central and remote (would need some sort of changelog on central server, to know what remote data to send to remote)

*Pros:*
- Fast to restore up to date data
- Minimum data loss (if any)
- Consistency between central and remote data

*Cons:*
- Quite a bit of work needed to make sure re-alignment mechanism is implemented
- Would also need to make sure correct proceedures are in place for setting up and restoring wal backup

## Decision

I suggest going with Option 2 but aiming to transition to Option 3. Current projected deployments would be small to mid level facilities with small amount of data, thus I think Option 2 would be enough to meet current demand.

Option 3 should be researched further and speced out as a long term solution

Btw I still hold an assumption that data corruption scenario is very low risk and if there is data corruption it's likely to be hardware/physical damage at which point it's likely local backups are damaged.