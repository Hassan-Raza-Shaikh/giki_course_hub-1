import React from 'react';

/**
 * Centered "nothing here" block. Wrap in <Card> when it stands alone.
 *   <EmptyState icon={<Bell size={56} strokeWidth={1.5} />} title="All caught up"
 *               text="New notifications will show up here." action={<Button>…</Button>} />
 */
const EmptyState = ({ icon, title, text, action }) => (
  <div className="ui-empty">
    {icon && <div className="ui-empty__icon">{icon}</div>}
    {title && <h2 className="ui-empty__title">{title}</h2>}
    {text && <p className="ui-empty__text">{text}</p>}
    {action}
  </div>
);

export default EmptyState;
