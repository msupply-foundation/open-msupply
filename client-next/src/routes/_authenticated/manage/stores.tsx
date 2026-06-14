import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/manage/stores")({
  component: () => <PlaceholderPage titleKey="app.stores" />,
});
