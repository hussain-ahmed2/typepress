/**
 * Loading Component — Skeleton loader for pages.
 */
export function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  );
}

/**
 * Spinner Component — Loading spinner for buttons and actions.
 */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.884 3 7.931v-3.284z" />
    </svg>
  );
}

/**
 * Empty State Component — Shown when no data is available.
 */
export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="text-gray-500 mt-1">{description}</p>
    </div>
  );
}

/**
 * Error Alert Component — Displays error messages.
 */
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
      {message}
    </div>
  );
}

/**
 * Success Alert Component — Displays success messages.
 */
export function SuccessAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
      {message}
    </div>
  );
}
