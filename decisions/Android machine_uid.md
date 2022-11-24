# Versions and Compatibility

- _Date_: 2022-11-24
- _Deciders_: Mark Prins, Andrei Evguenov, Chris Petty
- _Status_: DECIDED
- _Outcome_: Option 1. ANDROID_ID

## Context

The mSupply sync system requires that remote sites send an HTTP request header `msupply-site-uuid` with a device ID. This is to help prevent users accidentally setting up two devices syncing with the same site, as that'll cause data to become out of sync as both devices will consume the single message queue for the site.

Some common cases:

- A user is accidentally setting up a second device with a site already in use.
- A device was factory reset due to various scenarios, such as bad configuration requiring starting from scratch.
- A database is shared with the mSupply support team to debug issues with.

When the ID changes, an admin on the central server must clear the hardware ID for the site in order to allow syncing with the new hardware ID.

This uuid should uniquely idenitify the device where possible. Ideally it should remain the same when:

- The device has the OS reinstalled/factory reset
- The app is reinstalled
- The app data is cleared/DB deleted
- The app is updated

A constraint has emerged for the Android platform, where the [decision has been made to be very restrictive on getting a unique ID for the device](https://developer.android.com/about/versions/10/privacy/changes?authuser=1#non-resettable-device-ids) from Android 10 onwards. In short, this is to address privacy concerns on the platform. We cannot access a device ID like the IMEI programatically.

So we need the next best thing that satisfies the goals above.

Note: mSupply Desktop uses [this for windows.](https://learn.microsoft.com/en-gb/windows/win32/cimwin32prov/win32-computersystemproduct)

## Options

### Option 1 - ANDROID_ID

https://developer.android.com/reference/android/provider/Settings.Secure#ANDROID_ID

This is the ID that Android documentation recommends for identifying an android application for a given user. The ID resets when if any of the following happens:

- Device is factory reset (doesn't happen very often)
- The user changes (practically never happens when we have root device management software installed)
- The app signing key changes (we'd surely never do this)

_Pros:_

- Is officially what Android encourages

_Cons:_

- Will change on factory resets

### Option 2 - Save a generated UUID in app data

Simply generate a UUID and save in the app data.

_Pros:_

- One very simple implementation for all platforms

_Cons:_

- Changes on factory resets
- Changes on clearing app data/reinstalling app
- Breaks the protection of stopping sync when a database is shared (in desktop deployments with postgres/sqlite)

### Option 3 - Mac Address

The network adapter's ID. [Android shut down access to this in Android 6.](https://developer.android.com/about/versions/marshmallow/android-6.0-changes.html#behavior-hardware-id)

Pros/cons: Unusable!

## Decision

Currently the decision is for Option 1. It has the least cons, fitting closest to our ideals.

- Option 2 resets too frequently. App data resets aren't uncommon especially in development
- Option 3 Can't get MAC address on Androids

## Consequences

Android apps must use `ANDROID_ID` as a unique identifier. Omsupply must implement this for the `machine_uid`, which is used in sync API HTTP request headers.
