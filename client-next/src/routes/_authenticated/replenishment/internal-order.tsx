import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/replenishment/internal-order")({
  component: () => <PlaceholderPage titleKey="app.internal-order" />,
});
