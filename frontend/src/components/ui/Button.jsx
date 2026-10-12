import React from 'react';
import { cx } from './cx';

/**
 * Pill button in the app's style.
 * variant: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'ghost' | 'danger-outline'
 * size: 'sm' | 'md' | 'lg'
 * Pass `as={Link}` / `as="a"` to render a link that looks like a button.
 */
const Button = React.forwardRef(({ as: Tag = 'button', variant = 'default', size = 'md', block, icon, className, children, ...props }, ref) => (
  <Tag
    ref={ref}
    type={Tag === 'button' && !props.type ? 'button' : props.type}
    className={cx('ui-btn', variant !== 'default' && `ui-btn--${variant}`, size !== 'md' && `ui-btn--${size}`, block && 'ui-btn--block', className)}
    {...props}
  >
    {icon}
    {children}
  </Tag>
));
Button.displayName = 'Button';

export const IconButton = React.forwardRef(({ label, className, children, ...props }, ref) => (
  <button ref={ref} type="button" aria-label={label} title={label} className={cx('ui-icon-btn', className)} {...props}>
    {children}
  </button>
));
IconButton.displayName = 'IconButton';

export default Button;
