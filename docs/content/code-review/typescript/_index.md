+++
title = "Typescript"
weight = 30
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Code Review Comments for Typescript

## useTranslation()

Translations are now being translated in the `common` translation file.

We're using [react-i18next](https://react.i18next.com/) for localisations.
Collections of translatable items are grouped into namespaces so that we can reduce bundle sizes and keep files contained to specific areas.

## useTranslation() with plurals

When translating strings, it's common to need a singular and plural option.
This can be accomplished using a `_one` and `_other` suffix on the translation key and passing a parameter to the translation request called 'count'.

**Example**

`common.json`
```
{
  "permissions_one": "Permission",
  "permissions_other": "Permissions"
}
```

`example.ts`
```
const t = useTranslation();

let permissionList = ['Permission a'];

let translation = t("permissions", {count: permissionList.length});
// translation will contain 'Permission'

let permissionList = ['Permission a', 'Permission b'];

let translation = t("permissions", {count: permissionList.length});
// translation will now contain 'Permissions'
```

## Avoid using type assertions ('as' keyword)

Use of [type assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions) should be avoided, it can cause runtime errors in what looks like safe code. If type assertions have to be used, the resulting type should be consumed entirely in the same scope (with maximum amount of safety checks):

```typescript
const myCanvas = document.getElementById("main_canvas") as HTMLCanvasElement;
if (!myCanvas) throw new Error("no canvas");
if (!myCanvas.getContext) throw new Error("not a canvas");

const gl = myCanvas.getContext("webgl", {
  antialias: false,
  depth: false,
});
```

Example of why type assertions can be dangerous

```typescript
interface Check {
   id: string,
   willBeMissing: string
}

// ..

const doCheck = (check: Check) => {
   console.log(check.id)
   // ..
   helper(check)
}

const helper = (check: Check) => {
   console.log(check.willBeMissing.length) // runtime error (if check not Check)
}

// ..

const getLooksLikeCheck = () => ({ id: 'one' });

doCheck(getLooksLikeCheck() as Check) // runtime error
```

[Union alternative to the above](https://www.typescriptlang.org/play?#code/JYOwLgpgTgZghgYwgAgMIAsIINbIN4BQyxYAngA4QhwC2EAXMgOQZbZMA0RxwAJowGcwUUAHMuxZAHdgAG1kAhCAFlgAgWMHCxBAL4ECoSLEQoA8iFmkAkr3zdkZStTqMmFq7c4O+WkSHE9AwB6YOQAOnCDBAB7ECFkXhjWHGQAXmQACgRMHEYU3AAfZA8bXgBKdIA+e0lY+JjZCHDZGNFs3OxwvnKHUIioyWAYLJy2cKcqWhQ02eYCpl7JTFlKKA62Xv0CeoSVtfTRzvzOyrSawjq4gUbm1vaxnHCZeSVVdTEWqlEwdC2QsKRZDRa5gZCiCBgAAyMRi2AEUOA2AgBUOmXKjFKtmqWTwyF8zDiEE4jgoU1czCxvCYyF05QA3AYkgVMhDobD4YjkSzyr0gA) (with minimum changes)

## Imports

If using co-pilot ( and possibly other helpers 🤷 ), you may have an auto generated import appear which has the format 'packages/..'
Do not use these! While it will work as a standard runtime import, it will cause jest tests to fail.

Prefer

`import { InternalSupplierSearchModal, NameRowFragment } from '@openmsupply-client/system';`

Instead of

`import { InternalSupplierSearchModal, InternalSupplierSearchModal, NameRowFragment, NameRowFragment } from 'packages/system/src';`

You can generally find an aliased path to use instead, or a reference which is relative to the current file.

When exporting from packages, if an item is to be used outside of the package, export it from the package itself. This may require exporting from the root `index.ts` of the package and back up the tree of index files.

Prefer

`import { InternalSupplierSearchModal, NameRowFragment } from '@openmsupply-client/system';`

Instead of

`import { NameRowFragment } from '@openmsupply-client/system/src/Name/api';`

This makes is clear exactly what is being exported, and therefore depended on, out of the package. It's also neater ( personal opinion! ) and less fragile. If you are exporting from the root of the package then the internal structure can safely change.

## Avoid nested ternary

Nested ternary operators can make code difficult to read and understand, which can lead to maintenance issues and bugs.

Instead:

* Using `if/else` statements:

```typescript
let result;
if (condition1) {
    result = value1;
} else {
    result = value2;
}
```

* Using functions:

```typescript
function getResult(condition1, value1, value2) {
    if (condition1) {
        return value1;
    } else {
        return value2;
    }
}
```

* Using switch statements:

```typescript
let result;
switch (true) {
    case condition1:
        result = value1;
        break;
    case condition2:
        result = value2;
        break;
    default:
        result = value3;
}
```
