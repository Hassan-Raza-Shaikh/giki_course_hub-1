import React from 'react';

/**
 * The header card at the top of every page: icon tile, title, subtitle,
 * and optional actions on the right.
 *   <PageHeader icon={<Bell size={40} strokeWidth={2.5} />} title="Notifications"
 *               subtitle="Everything that happened while you were away." />
 */
const PageHeader = ({ icon, title, subtitle, actions, children }) => (
  <header className="ui-page-header">
    {icon && <div className="ui-icon-tile">{icon}</div>}
    <div className="ui-page-header__text">
      <h1 className="ui-page-header__title">{title}</h1>
      {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
      {children}
    </div>
    {actions && <div className="ui-page-header__actions">{actions}</div>}
  </header>
);

export default PageHeader;
