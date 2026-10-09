import { SkeletonAvatar, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

export function TeamRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <SkeletonContainer>
      <div className="border-subtle divide-subtle divide-y rounded-b-lg border border-t-0" aria-busy="true">
        {Array.from({ length: rows }, (_, index) => `skeleton-row-${index}`).map((rowKey) => (
          <div key={rowKey} className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <SkeletonAvatar className="m-0 h-10 w-10 rounded-[10px]" />
            <div className="flex-1 space-y-2">
              <SkeletonText className="h-4 w-40" />
              <SkeletonText className="h-3 w-56" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonContainer>
  );
}

export function TeamFormSkeleton() {
  return (
    <SkeletonContainer>
      <div
        className="border-subtle space-y-6 rounded-b-lg border border-t-0 px-4 py-8 sm:px-6"
        aria-busy="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2">
            <SkeletonText className="h-4 w-24" />
            <SkeletonText className="h-9 w-full" />
          </div>
        ))}
        <SkeletonText className="h-24 w-full" />
      </div>
    </SkeletonContainer>
  );
}
