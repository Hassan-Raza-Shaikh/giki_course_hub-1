import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

// Loaded lazily by FileViewer so the markdown parser stays out of the course page bundle
const MarkdownRenderer = ({ children }) => <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>{children}</ReactMarkdown>;

export default MarkdownRenderer;
