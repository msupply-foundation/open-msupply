import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/replenishment/inbound-shipment")({
  component: () => <PlaceholderPage titleKey="app.inbound-shipment" />,
});
