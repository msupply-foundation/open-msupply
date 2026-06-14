import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/$storeId/manage/campaigns")({
  component: () => <PlaceholderPage titleKey="app.campaigns" />,
});
