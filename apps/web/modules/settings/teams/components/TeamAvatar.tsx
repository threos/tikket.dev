import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { getInitials } from "../lib/teamUtils";

const SIZE_CLASSES = {
  xs: "h-4 w-4 min-w-4 rounded text-[8px]",
  md: "h-8 w-8 min-w-8 rounded-md text-xs",
  mdLg: "h-10 w-10 min-w-10 rounded-[10px] text-sm",
} as const;

type TeamAvatarProps = {
  name: string;
  logoUrl: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
};

export function TeamAvatar({ name, logoUrl, size = "mdLg", className }: TeamAvatarProps) {
  if (logoUrl) {
    return <Avatar shape="square" size={size} imageSrc={logoUrl} alt={name} className={className} />;
  }

  // Rendered directly instead of via Avatar's fallback so initials show immediately without a flash.
  return (
    <span
      aria-hidden="true"
      className={classNames(
        "bg-emphasis text-emphasis border-subtle inline-flex shrink-0 select-none items-center justify-center border font-semibold leading-none",
        SIZE_CLASSES[size],
        className
      )}>
      {getInitials(name)}
    </span>
  );
}
