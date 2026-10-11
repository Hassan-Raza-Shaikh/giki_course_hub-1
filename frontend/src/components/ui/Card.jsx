import React from 'react';
import { cx } from './cx';

/**
 * Soft card: --bg-card fill, 1px border, 24px radius, soft shadow.
 * padding: 'none' | 'md' | 'lg'   interactive: hover lift + pointer
 * Use <Card.Header> / <Card.Body> for a card with a divided title row.
 */
const Card = ({ as: Tag = 'div', padding = 'md', interactive, className, children, ...props }) => (
  <Tag
    className={cx('ui-card', padding === 'md' && 'ui-card--pad', padding === 'lg' && 'ui-card--pad-lg', padding === 'none' && 'ui-card--flush', interactive && 'ui-card--interactive', className)}
    {...props}
  >
    {children}
  </Tag>
);

Card.Header = ({ className, children, ...props }) => <div className={cx('ui-card__header', className)} {...props}>{children}</div>;
Card.Body = ({ className, children, ...props }) => <div className={cx('ui-card__body', className)} {...props}>{children}</div>;

export default Card;
