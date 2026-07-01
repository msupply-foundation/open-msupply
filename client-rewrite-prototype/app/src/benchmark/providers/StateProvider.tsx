import type { ReactNode } from "react";
import type { Draft } from "@/benchmark/StateAdapter";
import type { Impl } from "@/benchmark/config";
import { NaiveStateProvider } from "./NaiveStateProvider";
import { ContextMemoStateProvider } from "./ContextMemoStateProvider";
import { ZustandStateProvider } from "./ZustandStateProvider";

/*
 * The single switch. `impl` selects the provider; that is the whole mechanism
 * the benchmark toggles. Mount it with a key of `${impl}:${fields}` so changing
 * either gives a clean remount and no stale store/state leaks between
 * conditions.
 */
export const StateProvider = ({ impl, initial, children }: { impl: Impl; initial: Draft; children: ReactNode }) => {
  if (impl === "naive") {
    return <NaiveStateProvider initial={initial}>{children}</NaiveStateProvider>;
  }
  if (impl === "context-memo") {
    return <ContextMemoStateProvider initial={initial}>{children}</ContextMemoStateProvider>;
  }
  return <ZustandStateProvider initial={initial}>{children}</ZustandStateProvider>;
};
