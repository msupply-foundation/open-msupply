import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/$storeId/dispensary/prescription")({
  component: () => <PlaceholderPage titleKey="app.prescription" />,
});
