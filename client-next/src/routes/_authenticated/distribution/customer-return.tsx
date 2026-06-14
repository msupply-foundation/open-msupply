import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/distribution/customer-return")({
  component: () => <PlaceholderPage titleKey="app.customer-return" />,
});
