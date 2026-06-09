export default function SkeletonLoader() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-secondary/20 rounded-lg w-48 animate-pulse" />
      <div className="space-y-3">
        <div className="h-4 bg-secondary/20 rounded animate-pulse w-full" />
        <div className="h-4 bg-secondary/20 rounded animate-pulse w-5/6" />
        <div className="h-4 bg-secondary/20 rounded animate-pulse w-4/5" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 bg-secondary/20 rounded-xl animate-pulse h-32" />
        ))}
      </div>
      <div className="h-64 bg-secondary/20 rounded-xl animate-pulse" />
    </div>
  )
}
