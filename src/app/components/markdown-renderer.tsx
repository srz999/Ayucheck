'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ComponentPropsWithoutRef } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Custom text renderer to handle citations
  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(【[^】]+】)/g);
    
    return parts.map((part, index) => {
      const citationMatch = part.match(/【([^】]+)】/);
      if (citationMatch) {
        const citationText = citationMatch[1];
        // Parse citation format: Ayurvedic Pharmacopoeia Vol-1†HerbName†Page X
        const citationParts = citationText.split('†');
        const source = citationParts[0] || 'Source';
        const herbName = citationParts[1] || 'Reference';
        const page = citationParts[2] || '';
        
        return (
          <span
            key={index}
            className="inline-block bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold ml-1 cursor-help hover:from-green-600 hover:to-green-700 transition-all hover:scale-105 shadow-sm"
            title={`Source: ${source}\nHerb: ${herbName}\n${page}`}
          >
            📚 {herbName} {page && `• ${page}`}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold text-green-900 mt-6 mb-4" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-bold text-green-800 mt-5 mb-3" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-semibold text-green-700 mt-4 mb-2" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-base font-semibold text-green-700 mt-3 mb-2" {...props}>
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children, ...props }) => {
            const processChildren = (node: any): any => {
              if (typeof node === 'string') {
                return renderTextWithCitations(node);
              }
              return node;
            };
            
            return (
              <p className="mb-3 leading-relaxed" {...props}>
                {typeof children === 'string' ? renderTextWithCitations(children) : children}
              </p>
            );
          },
          
          // Lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside mb-3 space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="ml-4" {...props}>
              {typeof children === 'string' ? renderTextWithCitations(children) : children}
            </li>
          ),
          
          // Code blocks
          code: ({ inline, className, children, ...props }: ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
            if (inline) {
              return (
                <code 
                  className="bg-green-50 text-green-800 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code 
                className="block bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono my-3"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre className="bg-gray-900 rounded-lg overflow-x-auto my-3" {...props}>
              {children}
            </pre>
          ),
          
          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote 
              className="border-l-4 border-green-500 pl-4 py-2 my-3 bg-green-50 italic text-gray-700"
              {...props}
            >
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ children, href, ...props }) => (
            <a 
              href={href}
              className="text-green-600 hover:text-green-700 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          
          // Strong/Bold
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-green-900" {...props}>
              {children}
            </strong>
          ),
          
          // Emphasis/Italic
          em: ({ children, ...props }) => (
            <em className="italic text-gray-700" {...props}>
              {children}
            </em>
          ),
          
          // Horizontal rule
          hr: ({ ...props }) => (
            <hr className="my-4 border-t border-green-200" {...props} />
          ),
          
          // Tables
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-green-200 rounded-lg" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-green-100" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="divide-y divide-green-200" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-green-900" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-2 text-sm" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
