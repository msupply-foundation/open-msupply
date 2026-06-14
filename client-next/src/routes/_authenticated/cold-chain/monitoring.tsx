import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/cold-chain/monitoring")({
  component: () => <PlaceholderPage titleKey="app.monitoring" />,
});
