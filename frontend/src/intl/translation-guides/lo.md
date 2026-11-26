# Lao (`lo`) translation guide

Read by the `translate` skill before drafting Lao.

**No team glossary exists for Lao yet.** Everything below is taken from the catalog
(`frontend/src/intl/locales/lo/common.json`), counted by script over the 4,078 keys that have
both an English and a Lao value. Where the catalog is split, the majority is the house term and
the split goes under open questions. When a Lao reviewer or PM settles a term, record it here and
say who settled it and when.

## House style

- **Formal _ທ່ານ_ throughout.** 164 strings use _ທ່ານ_; none use _ເຈົ້າ_. All 111 English
  strings with "you/your" use _ທ່ານ_. _ພວກເຮົາ/ເຮົາ_ ("we") appears in 11 strings, only where
  the English says "we/our".
- **_ກະລຸນາ_ only for "please".** All 52 English strings with "please" use _ກະລຸນາ_ (56
  strings use it in all). Instructions without "please" are a bare verb: _ໃສ່ວັນທີທີ່ຖືກຕ້ອງ._,
  _ເລືອກໂຄງການ_; a step in a sequence sometimes takes _ໃຫ້_ (_ໃຫ້ຊິງຄ໌ຂໍ້ມູນ, ລໍຖ້າໃຫ້ສຳເລັດ, ແລ້ວລອງໃໝ່._).
  No polite particles (_ແດ່_ 1, _ເດີ_ 3; never in buttons).
- **Buttons are a bare verb phrase**: 138 of 204 buttons start with a verb (_ດາວໂຫຼດ_, _ນຳເຂົ້າ_,
  _ເລືອກໄຟລ໌ເພື່ອອັບໂຫຼດ_, _ລຶບ_). None start with _ກະລຸນາ_, none end in _ແລ້ວ_. "New X" buttons
  are the noun + _ໃໝ່_ (_ໃບສົ່ງສິນຄ້າອອກໃໝ່_; 24/24 buttons). Only 4 buttons are nominalised with _ການ_.
- **Done states take _ແລ້ວ_**: single-word "-ed" statuses end in _ແລ້ວ_ in `log.` (31/31),
  `status.` (12/13) and `label.` (34/52): _ລຶບແລ້ວ_, _ອັບເດດແລ້ວ_. Leave _ແລ້ວ_ off where the
  action hasn't happened yet (a preview of what an import would do).
- **Sentence punctuation mirrors the English**: of 443 message/error strings whose English ends
  in a full stop, 442 end in `.` in Lao; strings without one in English have none. `;` is kept
  where the English has it (3/3). No space before `:` (108 strings, 0 with a space).
- **Spaces**: Lao doesn't space words. Spaces separate clauses and set off _ແລະ_ (116/116 spaced
  " ແລະ ") and _ຫຼື_ (104/159 spaced " ຫຼື "). `{{tokens}}` are set off by spaces (340 of 383
  strings with a token).
- **A button or tab named in running text** is set off by spaces, without quotes:
  _ກົດ ຕົກລົງ ເພື່ອບັນທຶກ…_ (31 strings, mostly `messages.click-to-return-*`). Single quotes appear
  where the English has them (32 vs 38 in English).
- **Counts**: the number goes before its noun or classifier, _{{count}} ແຖວ_, _{{count}} ວັນ_;
  when the noun isn't itself a classifier, the count follows with _ລາຍການ_:
  _ຜົນທີ່ກົງກັນອີກ {{count}} ລາຍການ_. 38 of 126 plural `_other` values start with the count (54 in
  English): Lao often puts the verb first, _ເລືອກແລ້ວ {{count}} ລາຍການ_. "N of M" is
  _{{n}} ຈາກ {{total}}_ (4/4).
- **"Unable to / couldn't X"** is _ບໍ່ສາມາດ X ໄດ້_ (41 of 62 "Unable to"; 26 of 32 "couldn't");
  short headings use _X ບໍ່ໄດ້_ (6). "Unable to find" is _ບໍ່ພົບ_. "so" is _ສະນັ້ນ_ (22) over
  _ດັ່ງນັ້ນ_ (6); "then" is _ແລ້ວ_.
- **Spelling**: modern orthography only. _ຫຼ_ 423 vs _ຫລ_ 0; _ໜ_ 386 vs _ຫນ_ 0; _ໝ_ 366 vs _ຫມ_ 0;
  precomposed _ຳ_ 870 vs decomposed _ໍາ_ 0. Google's suggestions often use the old forms
  (_ດາວໂຫລດ_, _ນໍາເຂົ້າ_, _ຫນຶ່ງ_): don't copy them.

## Abbreviations and loanwords

- **The catalog doesn't abbreviate.** English short forms are written in full: _qty_ →
  _ຈຳນວນ_ (8/8 labels), _Max/Min_ → _ສູງສຸດ/ຕ່ຳສຸດ_, _Ref_ → _ເລກອ້າງອີງ_, _Mov. Avg._ →
  _ຄ່າສະເລ່ຍເຄື່ອນທີ່_. The one Lao short form is _ດ_ for months in `label.moving-average`
  (_(3 ດ)_). Where space is tight, drop words rather than abbreviate.
- **Acronyms and format/brand names stay in Latin script**: _Excel_ (4/4), _CSV_ (3/3), _PDF_
  (1/1), _ID_ (36/36), _AMC_ (21/21), _MOS_ (12/12), _VVM_ (14/14), _URL_ (8/8), _JSON_, _API_,
  _Open mSupply_. Exception: _SOH_ → _ສະຕ໋ອກຄົງເຫຼືອ_ (0/6 kept).
- **Common computing words are transliterated into Lao script**, not kept in Latin: _ໄຟລ໌_,
  _ອັບໂຫຼດ_, _ດາວໂຫຼດ_, _ເຊີບເວີ_ (87/87), _ອັບເດດ_, _ຊິງຄ໌_ (65/66; `label.clear-sync-token`
  keeps _Sync Token_).

## Glossary

Counts are English strings containing the term, split by the Lao used.

| English                 | Lao          | Count         | Notes                                                                                                                                                            |
| ----------------------- | ------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| import                  | ນຳເຂົ້າ      | 38/38         | noun _ການນຳເຂົ້າ_                                                                                                                                                |
| export                  | ສົ່ງອອກ      | 10/10         |                                                                                                                                                                  |
| upload                  | ອັບໂຫຼດ      | 37/37         | distinct from import                                                                                                                                             |
| download                | ດາວໂຫຼດ      | 14/14         |                                                                                                                                                                  |
| file                    | ໄຟລ໌         | 34/35         | _ແຟ້ມ_ once, for a medical file                                                                                                                                  |
| row                     | ແຖວ          | 26/26         | also "line" (_ແຖວສະຕ໋ອກ_)                                                                                                                                        |
| column                  | ຄໍລຳ         | 10/13         | _ຖັນ_ 3 (`table.column-visible`, `table.columns`, `table.edit-columns`)                                                                                          |
| sheet (Excel worksheet) | —            | 0             | only _ໃບ_ for a paper stocktake sheet (2); see open questions                                                                                                    |
| table                   | ຕາຕະລາງ      | 6/6           |                                                                                                                                                                  |
| record (data record)    | ລາຍການຂໍ້ມູນ | 16            | _ບັນທຶກ_ in 3 (`sync-status.footer-records-queued_other`, `warning.high-number-records-to-sync`, `messages.custom-fields-in-header`); _ບັນທຶກ_ also means "save" |
| unit                    | ຫົວໜ່ວຍ      | 48/56         | the rest are `{{unit}}` tokens                                                                                                                                   |
| item                    | ລາຍການ       | 203/234       | _ລາຍການສິນຄ້າ_ 16 (incl. `items`, the Items table), _ສິນຄ້າ_ 14                                                                                                  |
| location type           | ປະເພດຕຳແໜ່ງ  | 2/2           |                                                                                                                                                                  |
| location (storage)      | ຕຳແໜ່ງ       | 60/60         |                                                                                                                                                                  |
| user                    | ຜູ້ໃຊ້       | 13/13         |                                                                                                                                                                  |
| preview                 | ຕົວຢ່າງ      | 1/1           | `label.colour-preview` only                                                                                                                                      |
| change (noun)           | ການປ່ຽນແປງ   | 15/19         | verb "change" is _ປ່ຽນ_ (35/38)                                                                                                                                  |
| new                     | ໃໝ່          | 112/112       | after the noun                                                                                                                                                   |
| updated                 | ອັບເດດ       | 29/29         | not _ປັບປຸງ_ (that's "adjustment")                                                                                                                               |
| deleted                 | ລຶບ          | 74/74         |                                                                                                                                                                  |
| unchanged               | ບໍ່ປ່ຽນແປງ   | 1/2           | _ປ່ອຍໄວ້ຄືເດີມ_ for "leave unchanged"                                                                                                                            |
| error                   | ຂໍ້ຜິດພາດ    | 49/57         | _ຄວາມຜິດພາດ_ 1                                                                                                                                                   |
| problem                 | ບັນຫາ        | 6/6           |                                                                                                                                                                  |
| filter (noun)           | ຕົວກັ່ນຕອງ   | 17/34         | _ກັ່ນຕອງ_ 16 is the verb or _ການກັ່ນຕອງ_; Google's _ຕົວກອງ_ 0                                                                                                    |
| search                  | ຄົ້ນຫາ       | 32/32         |                                                                                                                                                                  |
| status                  | ສະຖານະ       | 96/101        | the rest are `{{status}}` tokens                                                                                                                                 |
| total                   | ລວມ / ຍອດລວມ | 25 / 15 of 58 | _ທັງໝົດ_ 9 ("in all"); "N of M" uses _ຈາກ_                                                                                                                       |
| tab                     | ແຖບ          | 4/4           |                                                                                                                                                                  |
| contains (filter)       | ມີຄຳວ່າ      | 5/7           | _ລະຫັດ ຫຼື ຊື່ ມີຄຳວ່າ_                                                                                                                                          |
| apply                   | ນຳໃຊ້        | 7/8           |                                                                                                                                                                  |
| again                   | ອີກຄັ້ງ      | 9             | "try again" is _ລອງໃໝ່_; _ອີກເທື່ອ_ 0                                                                                                                            |
| limit                   | ຂີດຈຳກັດ     | 1/2           |                                                                                                                                                                  |
| sync                    | ຊິງຄ໌        | 65/66         |                                                                                                                                                                  |
| server                  | ເຊີບເວີ      | 87/87         |                                                                                                                                                                  |

### Terms settled in the 2026-11-26 backlog drafts

Settled by the drafts, not yet by a Lao reviewer. Change them here when one does.

| English                          | Lao               | Notes                                                                                          |
| -------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| dispense (verb, button)          | ຈ່າຍຢາ            | not Google's _ແຈກຢາຍ_ ("distribute")                                                           |
| dispensing record                | ການຈ່າຍຢາ         | keeps _ໃບສັ່ງຢາ_ for a prescriber's prescription; see open questions                           |
| Dispensing records (list/button) | ປະຫວັດການຈ່າຍຢາ   | "dispensing history"                                                                           |
| unnamed patient                  | ຄົນເຈັບບໍ່ລະບຸຊື່ | "no name given", not "has no name"                                                             |
| common medicines                 | ຢາທີ່ໃຊ້ເລື້ອຍ    | coined; _ຢາທົ່ວໄປ_ would read as "generic medicines"                                           |
| stock                            | ສະຕ໋ອກ            | never Google's _ຫຼັກຊັບ_ (financial securities)                                                |
| amount (of a medicine)           | ຈຳນວນ             | `label.amount` = _ຈຳນວນເງິນ_ is money; don't reuse it for quantities                           |
| tag                              | ປ້າຍກຳກັບ         | from `label.tag-colour`                                                                        |
| template                         | ແບບຟອມ            | catalog majority; not _ແມ່ແບບ_                                                                 |
| consumption                      | ການໃຊ້ຈ່າຍ        | not _ການບໍລິໂພກ_; consumption estimate = _ການປະມານການໃຊ້ຈ່າຍ_ (_ຄາດຄະເນ_ is forecast/expected) |
| short (units short)              | ຂາດ               | not _ສັ້ນ_ (short in length)                                                                   |
| left (quantity left)             | ເຫຼືອ             | not _ຊ້າຍ_ (left-hand side)                                                                    |
| screen                           | ໜ້າຈໍ             |                                                                                                |

## Open questions

- **column: _ຄໍລຳ_ (10) vs _ຖັນ_ (3).** `table.column-visible`, `table.columns` and
  `table.edit-columns` use _ຖັນ_; the reset-column labels and import errors use _ຄໍລຳ_. Drafts use
  _ຄໍລຳ_.
- **clear: _ລຶບ_ (7) vs _ລ້າງ_ (6).** `label.clear-filter` = _ລຶບຕົວກັ່ນຕອງ_ but
  `label.clear-all-filters` = _ລ້າງທັງໝົດ_, `common.clear` = _ລ້າງ_. _ລຶບ_ is also "delete", so for
  clearing a filter or field _ລ້າງ_ is the safer choice; the PMs should pick one.
- **record: _ລາຍການຂໍ້ມູນ_ (16) vs _ບັນທຶກ_ (3)** for a database record (keys above).
- **total: _ລວມ_ (25) vs _ຍອດລວມ_ (15).** _ຍອດລວມ_ in headings (`heading.total`), _ລວມ_ inside
  longer labels; not a conflict so much as two uses.
- **sheet / workbook / cell** (Excel terms) have no catalog precedent. The central-data drafts
  use _ແຜ່ນງານ_ (worksheet), _ໄຟລ໌ Excel_ (workbook) and _ເຊວ_ (cell); a Lao reviewer should
  confirm.
- **more: _ເພິ່ມ_ (misspelt, 22 strings) vs _ເພີ່ມ_ (116).** `button.more`, `common.more`,
  `button.order-more` and others use _ເພິ່ມ_; it's a typo for _ເພີ່ມ_.
- **dispensing record: _ໃບສັ່ງຢາ_ (15) vs _ການຈ່າຍຢາ_ (11).** _ໃບສັ່ງຢາ_ is the older majority,
  but it is also the word for a prescriber's prescription (`label.prescription-request`), so
  strings that name both (`messages.cant-delete-generated-dispensation`,
  `messages.confirm-ready-to-dispense`) already use _ການຈ່າຍຢາ_ for the dispensing record. New
  drafts use _ການຈ່າຍຢາ_. Still on _ໃບສັ່ງຢາ_: `button.view-prescription`,
  `error.failed-to-create-prescription`, `error.prescription-not-found`,
  `label.cancel-prescription`, `label.create-prescription`, `messages.deleted-prescriptions_other`,
  `messages.prescription-will-be-created` and others. A Lao reviewer should pick one.
- **status labels without _ແລ້ວ_**: 18 of 52 single-word "-ed" `label.` values leave it off.
