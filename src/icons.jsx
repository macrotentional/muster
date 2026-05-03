export function CuppedHandsHeart({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Heart */}
      <path d="M12 7c0 0-3-2-3-4C9 1.5 10.5 1 11.5 2L12 3l.5-1C13.5 1 15 1.5 15 3c0 2-3 4-3 4z" />
      {/* Left hand: wrist at bottom-left, curves up, single finger tip, inner palm sweeps right */}
      <path d="M3 22C3 19 3 15 5 12L5 10C5 8 7 8 7 10L7 14C8 17 10 19 11 20L11 22" />
      {/* Right hand: mirror */}
      <path d="M21 22C21 19 21 15 19 12L19 10C19 8 17 8 17 10L17 14C16 17 14 19 13 20L13 22" />
    </svg>
  )
}

export function PackageReturn({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 19V5" />
      <path d="M7 12h14" />
      <path d="m13 6-6 6 6 6" />
    </svg>
  )
}

export function PackageCircleCheck({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      overflow="visible"
      {...props}
    >
      <path d="M11 21.73a2 2 0 0 0 2 0l5-2.86A2 2 0 0 0 19 17V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 1 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <polyline points="2.29 7 12 12 19.71 7" />
      <path d="m6.5 4.27 9 5.15" />
      <circle cx="19.5" cy="19.5" r="6.75" fill="currentColor" stroke="none" />
      <path d="M16.05 19.5 18.75 22.2 23.55 16.8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ClockCircleX({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      overflow="visible"
      {...props}
    >
      <circle cx="11" cy="11" r="9" />
      <path d="M11 7v4l2.5 1.5" />
      <circle cx="19.5" cy="19.5" r="6.75" fill="currentColor" stroke="none" />
      <path d="M16.5 16.5 22.5 22.5 M22.5 16.5 16.5 22.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
