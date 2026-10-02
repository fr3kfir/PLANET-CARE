// Line icons (24px grid, currentColor) for navigation and plant cards.
const Svg = ({ children, className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
    {children}
  </svg>
)

export const ClockIcon = p => (
  <Svg {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5M5 5.5 3.5 7M19 5.5 20.5 7" /></Svg>
)
export const KitIcon = p => (
  <Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M12 10.5v6M9 13.5h6" /></Svg>
)
export const SearchIcon = p => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
)
export const BookIcon = p => (
  <Svg {...p}><path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z" /><path d="M12 6v13.5M15 9.5h3M15 12.5h3" /></Svg>
)
export const LeafIcon = p => (
  <Svg {...p}><path d="M5 20c0-7 3.5-12 14-14-1 9-5 13.5-12 13" /><path d="M5 20c2.5-4 5.5-7 9-9" /></Svg>
)
export const PinIcon = p => (
  <Svg {...p} fill="currentColor" stroke="none"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></Svg>
)
export const CanIcon = p => (
  <Svg {...p} fill="currentColor" stroke="none"><path d="M4 9h10v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM14 11l5-4 1.5 1.5-6.5 6.5zM6 6.5A2.5 2.5 0 0 1 11 6.5V8H9.5V6.5a1 1 0 0 0-2 0V8H6z" /></Svg>
)
export const DotsIcon = p => (
  <Svg {...p} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></Svg>
)
export const PlusPlantIcon = p => (
  <Svg {...p} strokeWidth="2.2"><path d="M14 21v-8M14 13c0-3.5 2-5.5 6-5.5 0 3.5-2 5.5-6 5.5zM14 15c0-3-1.7-4.5-5-4.5 0 3 1.7 4.5 5 4.5zM3 8h6M6 5v6" /></Svg>
)
export const GearIcon = p => (
  <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z" /></Svg>
)
export const CheckIcon = p => (
  <Svg {...p} strokeWidth="2.6"><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
)
export const BackIcon = p => (
  <Svg {...p} strokeWidth="2.2"><path d="m9 6 6 6-6 6" /></Svg>
)
export const CameraIcon = p => (
  <Svg {...p}><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>
)
export const BellIcon = p => (
  <Svg {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></Svg>
)
export const CalendarIcon = p => (
  <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Svg>
)
export const ChatIcon = p => (
  <Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></Svg>
)
