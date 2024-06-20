# Central server back up

- *Date*: 
- *Deciders*: 
- *Status*: 
- *Outcome*: 

## Intro

Prior to omSupply central server, we didn't need to consider omSupply backups because remote sites are backed up by synchronisation to mSupply central server.
mSupply central server is backed up on a schedule, it also contains journal (write ahead log of sort) of the changes since last backup. 
Now that we've started to use omSupply central server functionality, we need a strategy for backup up of remote and central data for omSupply central servers.

## Existing mSupply backup

We back up mSupply via a scheduled snapshot + journal file since last backup. 
There is UI to configure all of the parameters of the backup in mSupply.
We use cloud services to hold the backup, in case of full local failure.

We've restored mSupply central server data from latest local backup + current journal, on a number of occasions. I believe we had to use remote backups saved in cloud a couple of times.

Encryption for mSupply data happens at the cloud provider end

## Problem Space

### (A) Need to be able to:

1. Store local backup of omSupply central database
2. Store local backup of omSupply central files 
3. Send 1 and 2 to a cloud service to hold remote version of backups
4. Restore 1 and 2 with reasonable speed, consistency and recency

### (B) Other areas of consideration

1. When data is stored remotely, it needs to be safe from prying eye (encrypted)
2. We also have Grafana installed on most central instances, and I think we've been using the same postgres instance for both omSupply central and Grafana
3. Deal with or have a strategy to deal with misalignment of sync data between omSupply remote sites, omSupply central and mSupply central. Consider that omSupply or mSupply central data is restored, but there is some missalignment in recency, resulting in scenariors below

|  scenario | mSupply Central (MC) | omSupply Central (OMC) | omSupply Remote (OMR) | Side effect                                                                                                                                                                                                                                                                                                                                                                                                                 |
|:---------:|:--------------------:|:----------------------:|:---------------------:|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|   B.3.1   |          old         |         recent         |         recent        | Loss of data while restore of OMR data (via sync initialisation), due to missing data for that site on MC. OMC and OMR may miss some central data being added, since their cursor for that data would be ahead of central_change_log on MC. Some OMR remote records that are pushed to OMC may be related to central records on MC that are not present any more, thus when OMR is re-initialised some constraints may fail. |
|   B.3.2   |        recent        |           old          |         recent        | Loss of data while restore of OMR (via sync initialisation), due to missing data for that site on OMC. Some data being pushed OMC from OMR may not be integrated due to missing relation dependencies (that were pushed previously but are now missing). Some new OMC central data may not travel to OMR since the cursor of OMR for central data would be ahead of current OMC                                             |
|   B.3.3   |        recent        |         recent         |          old          | This would require some restore of backup on omSupply remote site, which is not something we recommend or support (if remote site data is lost, you should re-initialise)                                                                                                                                                                                                                                                   |
|   B.3.4   |          old         |           old          |         recent        | Combined effects of B.3.1 and B.3.2                                                                                                                                                                                                                                         
## About WAL

[Full description here](https://www.postgresql.org/docs/current/continuous-archiving.html#BACKUP-ARCHIVING-WAL). In summary, postgres has write ahead log (like journal in mSupply), and it can be used to restore a backup to a particular point. Like mSupply we can take an old backup, and look at WALs since that backup until now and restore that backup up to now. Unlike mSupply, postgres will 'cycle' through a few WAL files, which will typically be around 16mb, and re-use them. Archiving of WAL can be enabled so that before WAL file is re-used, it can be backed up (you can specify a command line or script for postgres to call when it archive even is triggered). For WAL to work in backups, should use `pg_basebackup` for backup snapshot, `pg_dump` won't work with WAL.

## Options

### Option 1 - pg_dump or pg_basebackup via mSupply

pg_dump on a schedule, mSupply can do it while doing it's own backup, can save backup in the same place it stores it's own backups so that A.3 would happen automatically

_Pros:_

- Quite simple
- A.3 is handled automatically (using the same mechanism as mSupply)
- Backup configurations in UI/UX in mSupply
- Restore should be reasonably fast
- Can deal with A.2 at the same time

_Cons:_

- A bit of code to implement and test in mSupply
- Would only be as recent as the last schedule time
- With pg_dump can't use WAL archiving but with pg_basebackup we can
- omSupply central would probably need to live on the same machine as mSupply


### Option 2 - WAL Archiving

Setup backup via WAL archiving. As part of omSupply central, our support staff can setup archiving and take pg_basebackup. Archiving can zip and password protect WAL. Can structure backup folders to allow for A.3

_Pros:_

- Can reduce the chance of B.3 related to OMC recency
- Upskilling support staff to be able to work with postgres WAL backups
- No UI to implement

_Cons:_

- Would need archive and unarchive scripts, that would also need to deal with file backup
- Restoring is more technical and may take longer
- Need a mechanism for periodic snapshot backup (to optimise space and speed of restore)
- Upskilling support staff to be able to work with postgres WAL backups

### Option 3 - Base backup via omSupply

Pg base backup can be done [via low level API (sql statements)]https://www.postgresql.org/docs/current/continuous-archiving.html#BACKUP-LOWLEVEL-BASE-BACKUP by omSupply server. With configurations and scheduling built into omSupply

_Pros:_

- Should be reasonably simple
- A.3 is handled automatically (using the same mechanism as mSupply)
- Backup configurations in UI/UX in omSupply
- Restore should be reasonably fast
- Can deal with A.2 at the same time

_Cons:_

- A bit of code to implement and test in omSupply
- Would only be as recent as the last schedule time

Could increase the size of WAL if we backup daily, this way we can still integrate latest backup with current WAL (but current WAL will not be stored remotely)

## Decision

I am leaning towards Option 3 for now, followed by Option 2 in the future. Option 3 require a bit of coding, but I think would be easier for support staff to administer and we can still integrate local WAL

## Consequences

B.2 Hasn't really been discussed, I am not sure if it needs to be considered in this KDD, since we may decide to combine Grafana and omSupply backups or keep them separate. Either way it shouldn't affect backup strategy. Although if we want restoration of omSpply database to be quicker and backup size to be smaller, we should consider keeping them on separate instances.
