import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/catalogue/items")({
  component: () => <PlaceholderPage titleKey="app.items" />,
});
