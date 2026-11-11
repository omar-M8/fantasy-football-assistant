import { cn } from "@/lib/utils";

/** A Sleeper avatar, or the first letter of the name when there isn't one. */
export function UserAvatar({
  avatarId,
  name,
  className,
}: {
  avatarId: string | null;
  name: string;
  className?: string;
}) {
  if (avatarId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small Sleeper CDN thumbnail, as in TeamHeader
      <img
        src={`https://sleepercdn.com/avatars/thumbs/${avatarId}`}
        alt=""
        className={cn("border-border size-10 shrink-0 rounded-full border", className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-secondary text-primary flex size-10 shrink-0 items-center justify-center rounded-full font-semibold",
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
