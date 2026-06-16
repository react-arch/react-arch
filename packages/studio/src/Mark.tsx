/** The React Arch brand mark (house + "G"). */
export function Mark({ size = 18, color = "#2563eb" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <path d="M24 102V52L64 18L104 52V102" stroke={color} strokeWidth={6} strokeLinecap="square" strokeLinejoin="miter" />
      <path d="M24 102H72V70H48" stroke={color} strokeWidth={6} strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}
