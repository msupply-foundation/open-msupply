import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/replenishment/suppliers")({
  component: () => <PlaceholderPage titleKey="app.suppliers" />,
});
