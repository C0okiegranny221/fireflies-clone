import { cn, initials } from "@/lib/utils";

interface Person {
  name: string;
  color: string;
}

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: Person & { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping avatars with a "+N" overflow chip, as in the meetings list. */
export function AvatarStack({
  people,
  max = 4,
  size = "sm",
}: {
  people: (Person & { id: number })[];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((p) => (
        <Avatar
          key={p.id}
          name={p.name}
          color={p.color}
          size={size}
          className="ring-2 ring-surface"
        />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-surface-hover font-semibold text-ink-secondary ring-2 ring-surface",
            SIZES[size],
          )}
          title={people
            .slice(max)
            .map((p) => p.name)
            .join(", ")}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
