import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/distribution/customers")({
  component: () => <PlaceholderPage titleKey="app.customers" />,
});
