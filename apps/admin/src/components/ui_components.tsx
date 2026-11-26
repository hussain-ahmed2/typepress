/**
 * Shared UI wrappers — shadcn-based primitives with legacy-compatible APIs.
 *
 * These components provide stable exports for admin pages while aligning
 * styling with semantic theme tokens and shadcn/ui components.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button as UiButton } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Props for the responsive page wrapper. */
interface PageWrapperProps {
  children: ReactNode;
  title?: string;
}

/** Props for the legacy Card wrapper. */
interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Column definition for ResponsiveTable. */
interface ResponsiveTableColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

/** Props for ResponsiveTable. */
interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  render_mobile: (item: T) => ReactNode;
}

/** Supported legacy button variants. */
type LegacyButtonVariant = 'primary' | 'secondary' | 'danger';

/** Supported legacy button sizes. */
type LegacyButtonSize = 'sm' | 'md' | 'lg';

/** Props for the legacy Button wrapper. */
interface ButtonProps {
  children: ReactNode;
  variant?: LegacyButtonVariant;
  size?: LegacyButtonSize;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /** Optional button type for form usage; defaults to button. */
  type?: 'button' | 'submit' | 'reset';
}

/** Props for the legacy Input wrapper. */
interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

/** Option shape for the legacy Select wrapper. */
interface SelectOption {
  value: string;
  label: string;
}

/** Props for the legacy Select wrapper. */
interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

/**
 * Responsive container for dashboard pages.
 */
export function PageWrapper({ children, title }: PageWrapperProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {title ? <h1 className="mb-6 text-2xl font-bold text-foreground">{title}</h1> : null}
      {children}
    </div>
  );
}

/**
 * Simple card surface with semantic background and drop shadow.
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={cn('rounded-md bg-card text-card-foreground drop-shadow', className)}>
      {children}
    </div>
  );
}

/**
 * Responsive table that renders a table on desktop and cards on mobile.
 */
export function ResponsiveTable<T>({ data, columns, render_mobile }: ResponsiveTableProps<T>) {
  return (
    <Card>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className="px-6 py-3 text-xs uppercase text-muted-foreground">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index} className="hover:bg-muted/50">
                {columns.map((col) => (
                  <TableCell key={col.key} className="px-6 py-4 text-sm">
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-border md:hidden">
        {data.map((item, index) => (
          <div key={index} className="p-4">
            {render_mobile(item)}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Maps legacy button variants to shadcn variants. */
const BUTTON_VARIANT_MAP: Record<LegacyButtonVariant, 'default' | 'secondary' | 'destructive'> = {
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
};

/** Maps legacy button sizes to shadcn sizes. */
const BUTTON_SIZE_MAP: Record<LegacyButtonSize, 'sm' | 'default' | 'lg'> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
};

/**
 * Legacy-compatible button wrapper backed by shadcn Button.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  className = '',
  type = 'button',
}: ButtonProps) {
  return (
    <UiButton
      type={type}
      variant={BUTTON_VARIANT_MAP[variant]}
      size={BUTTON_SIZE_MAP[size]}
      onClick={onClick}
      disabled={disabled}
      className={cn('rounded-md drop-shadow-sm', className)}
    >
      {children}
    </UiButton>
  );
}

/**
 * Legacy-compatible labeled input wrapper backed by shadcn Input.
 */
export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  error,
}: InputProps) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <UiInput
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(error && 'border-destructive focus-visible:ring-destructive/30')}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * Legacy-compatible labeled native select with semantic styling.
 */
export function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
