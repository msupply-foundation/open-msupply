import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/$storeId/catalogue/assets")({
  component: () => <PlaceholderPage titleKey="app.assets" />,
});
