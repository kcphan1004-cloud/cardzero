function DeckTypeIcon({
  type,
}: {
  type: string;
}) {
  const iconClassName =
    "h-7 w-7 fill-none stroke-current";

  switch (type) {
    case "快攻":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M13 2 4 14h7l-1 8 10-12h-7l0-8Z" />
        </svg>
      );

    case "中速":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m5 4 14 16" />
          <path d="m19 4-14 16" />
          <path d="m3 3 4 1-3 3-1-4Z" />
          <path d="m21 3-4 1 3 3 1-4Z" />
        </svg>
      );

    case "控制":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "组合技":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="18" cy="18" r="3" />
          <path d="m9 11 6-4" />
          <path d="m9 13 6 4" />
        </svg>
      );

    case "娱乐":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="4"
          />
          <circle cx="9" cy="9" r="1" />
          <circle cx="15" cy="9" r="1" />
          <circle cx="9" cy="15" r="1" />
          <circle cx="15" cy="15" r="1" />
        </svg>
      );

    case "比赛":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 4h8v4c0 4-2 7-4 8-2-1-4-4-4-8V4Z" />
          <path d="M8 6H4v2c0 3 2 5 5 5" />
          <path d="M16 6h4v2c0 3-2 5-5 5" />
          <path d="M12 16v4" />
          <path d="M8 20h8" />
        </svg>
      );

    default:
      return null;
  }
}