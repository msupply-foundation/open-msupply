import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/$storeId/catalogue/master-lists")({
  component: () => <PlaceholderPage titleKey="app.master-lists" />,
});
