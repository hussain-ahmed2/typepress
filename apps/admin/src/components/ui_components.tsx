/**
 * Page Wrapper — Responsive container for all dashboard pages.
 */
export function PageWrapper({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {title && <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>}
      {children}
    </div>
  );
}

/**
 * Card Component — Responsive card with drop shadow.
 */
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-md drop-shadow ${className}`}>
      {children}
    </div>
  );
}

/**
 * Responsive Table Wrapper — Shows table on desktop, cards on mobile.
 */
export function ResponsiveTable<T>({
  data,
  columns,
  render_mobile,
}: {
  data: T[];
  columns: { key: string; label: string; render?: (item: T) => React.ReactNode }[];
  render_mobile: (item: T) => React.ReactNode;
}) {
  return (
    <Card>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 text-sm">
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-200">
        {data.map((item, i) => (
          <div key={i} className="p-4">
            {render_mobile(item)}
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Button Component — Consistent button styling.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50';
  const variants = {
    primary: 'text-white',
    secondary: 'text-gray-700 bg-gray-100 hover:bg-gray-200',
    danger: 'text-white bg-red-600 hover:bg-red-700',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      style={variant === 'primary' ? { backgroundColor: '#2185d5' } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Input Component — Consistent input styling.
 */
export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${error ? 'border-red-500' : 'border-gray-300'}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

/**
 * Select Component — Consistent select styling.
 */
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
