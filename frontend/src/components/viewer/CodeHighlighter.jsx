import React from 'react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Loaded lazily by FileViewer; PrismAsyncLight also fetches each language grammar on demand
const CodeHighlighter = (props) => <SyntaxHighlighter style={atomDark} {...props} />;

export default CodeHighlighter;
