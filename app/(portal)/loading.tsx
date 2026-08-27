import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-36 w-full" /><Skeleton className="h-36 w-full" /></div>;
}
