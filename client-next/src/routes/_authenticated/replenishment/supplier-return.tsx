import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/replenishment/supplier-return")({
  component: () => <PlaceholderPage titleKey="app.supplier-return" />,
});
