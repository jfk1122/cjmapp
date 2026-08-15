interface Props {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconPlus = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconTrash = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

export const IconDots = ({ size = 16 }: Props) => (
  <svg {...base(size)} strokeWidth={2.4}>
    <path d="M12 6h.01M12 12h.01M12 18h.01" />
  </svg>
);

export const IconShare = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3M8 7l4-4 4 4" />
  </svg>
);

export const IconDownload = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4M12 3v12M8 11l4 4 4-4" />
  </svg>
);

export const IconPrint = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M7 9V3h10v6M7 19H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 15h10v6H7z" />
  </svg>
);

export const IconBack = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

export const IconCopy = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);

export const IconCheck = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconClose = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconUndo = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10H9" />
  </svg>
);

export const IconMap = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="m9 4-6 3v13l6-3 6 3 6-3V4l-6 3-6-3zM9 4v13M15 7v13" />
  </svg>
);

export const IconChevron = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
