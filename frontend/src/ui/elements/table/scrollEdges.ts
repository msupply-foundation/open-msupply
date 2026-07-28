// Which PHYSICAL edges of a horizontal scroll box still have content beyond
// them — i.e. where content is passing under a frozen column, which is what
// reveals that column's freeze shadow (see DataTable.module.css, #617).
//
// Physical, not logical, because a frozen leading column pins to the
// physical-left edge in either direction (DataTable.leadingPinnedStyle). That
// takes reconciling the two scrollLeft conventions: LTR runs 0 → max, RTL runs
// 0 → -max, where 0 is the RTL "start" — fully scrolled to the physical RIGHT,
// with every hidden pixel off to the LEFT. So distance from the content's
// physical left edge is `scrollLeft` in LTR and `max + scrollLeft` in RTL.
//
// `rtl` has to be passed in rather than inferred from the sign: at scrollLeft
// exactly 0 the two conventions are indistinguishable numerically but mean
// opposite things (LTR: nothing hidden left. RTL: everything hidden left).
//
// The 1px slack absorbs fractional layout widths: a table whose columns land on
// sub-pixel boundaries leaves a remainder that never quite reaches the end, so
// a strict > 0 would strand the far-edge shadow on forever.
export const hiddenEdges = (
  box: { scrollLeft: number; scrollWidth: number; clientWidth: number },
  rtl: boolean
): { left: boolean; right: boolean } => {
  const max = box.scrollWidth - box.clientWidth;
  const fromLeft = rtl ? max + box.scrollLeft : box.scrollLeft;
  return { left: fromLeft > 1, right: max - fromLeft > 1 };
};
