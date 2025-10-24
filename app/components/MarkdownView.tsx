'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownView({ text }: { text: string }) {
  return (
    <div className="text-sm space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h2 {...props} className="text-base font-semibold leading-tight mt-2 mb-1" />
          ),
          h2: (props) => (
            <h3 {...props} className="text-base font-semibold leading-tight mt-2 mb-1" />
          ),
          h3: (props) => (
            <h4 {...props} className="text-sm font-semibold leading-tight mt-2 mb-1" />
          ),
          p: (props) => <p {...props} className="text-sm leading-7" />,
          ul: (props) => <ul {...props} className="list-disc pl-5 space-y-1" />,
          ol: (props) => <ol {...props} className="list-decimal pl-5 space-y-1" />,
          li: (props) => <li {...props} className="my-0.5" />,
          hr: (props) => <hr {...props} className="my-3 border-border" />,
          strong: (props) => <strong {...props} className="font-semibold" />,
          code: ({ className, children, ...props }: any) => (
            <code className={`${className || ''} rounded bg-muted px-1 py-0.5 text-xs`} {...props}>
              {children}
            </code>
          ),
          pre: ({ className, children, ...props }: any) => (
            <pre
              className={`${className || ''} block rounded bg-muted p-2 text-xs overflow-x-auto`}
              {...props}
            >
              {children}
            </pre>
          )
        }}
      >
        {text || ''}
      </ReactMarkdown>
    </div>
  );
}
