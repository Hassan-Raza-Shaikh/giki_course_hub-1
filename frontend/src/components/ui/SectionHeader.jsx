import React from 'react';

/**
 * Title row above a list or group, with an optional count pill and a
 * right-aligned action (e.g. a "Download all" button).
 *   <SectionHeader icon={<FileText size={20} />} title="Slides" count={12}
 *                  action={<Button size="sm">Download all</Button>} />
 */
const SectionHeader = ({ as: Tag = 'h2', icon, title, count, subtitle, action }) => (
  <div className="ui-section-header">
    <Tag className="ui-section-header__title">
      {icon}
      {title}
      {count != null && <span className="ui-section-header__count">{count}</span>}
    </Tag>
    {action}
    {subtitle && <p className="ui-section-header__subtitle">{subtitle}</p>}
  </div>
);

export default SectionHeader;
