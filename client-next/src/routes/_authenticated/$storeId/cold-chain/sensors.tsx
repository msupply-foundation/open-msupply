import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/$storeId/cold-chain/sensors")({
  component: () => <PlaceholderPage titleKey="app.sensors" />,
});
