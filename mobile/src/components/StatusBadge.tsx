const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-yellow-100 text-yellow-800",
  DELIVERED: "bg-orange-100 text-orange-800",
  RECEIVED: "bg-green-100 text-green-800",
  VERIFIED: "bg-gray-100 text-gray-800",
  FINALISED: "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}
    >
      {status}
    </span>
  );
}
