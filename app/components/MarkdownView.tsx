// Markdown 渲染器（中文注释）：使用 react-markdown + remark-gfm，并应用简洁的层次化样式
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownView({ text }: { text: string }) {
  return (
    <div className="text-sm space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h2 {...props} className="text-base font-semibold leading-tight mt-2 mb-1" />,
          h2: ({ node, ...props }) => <h3 {...props} className="text-base font-semibold leading-tight mt-2 mb-1" />,
          h3: ({ node, ...props }) => <h4 {...props} className="text-sm font-semibold leading-tight mt-2 mb-1" />,
          p: (props) => <p {...props} className="text-sm leading-7" />,
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 space-y-1" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 space-y-1" />,
          li: ({ node, ...props }) => <li {...props} className="my-0.5" />,
          hr: (props) => <hr {...props} className="my-3 border-border" />,
          strong: (props) => <strong {...props} className="font-semibold" />,
          code: ({ inline, ...props }) => inline ? (
            <code {...props} className="rounded bg-muted px-1 py-0.5 text-xs" />
          ) : (
            <code {...props} className="block rounded bg-muted p-2 text-xs" />
          )
        }}>
        {text || ''}
      </ReactMarkdown>
    </div>
  );
}
