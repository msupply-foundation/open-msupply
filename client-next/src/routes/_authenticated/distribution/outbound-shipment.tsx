import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/distribution/outbound-shipment")({
  component: () => <PlaceholderPage titleKey="app.outbound-shipment" />,
});
