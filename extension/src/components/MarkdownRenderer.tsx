import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Check, Copy, ExternalLink } from "lucide-react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import html from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import toml from "react-syntax-highlighter/dist/esm/languages/prism/toml";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import lua from "react-syntax-highlighter/dist/esm/languages/prism/lua";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";

// --- Register Languages ---
// JS/TS & React
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("tsx", tsx);

// Web & Markup
SyntaxHighlighter.registerLanguage("html", html);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);

// Config & Data
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("toml", toml);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);
SyntaxHighlighter.registerLanguage("lua", lua);

// Backend & DB & Others
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("diff", diff);

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div
      className={`prose prose-sm prose-neutral max-w-none ${className} break-words [&>*:first-child]:mt-0`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Header Styling
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
          ),

          // List Styling
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children, className }) => {
            // Check if this li contains a task list checkbox (remark-gfm adds 'task-list-item' class)
            const isTaskListItem = className?.includes("task-list-item");
            return (
              <li
                className={`text-sm leading-relaxed ${
                  isTaskListItem ? "flex items-start gap-2 list-none -ml-4" : ""
                }`}
              >
                {children}
              </li>
            );
          },
          input: (props) => {
            if (props.type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={props.checked}
                  disabled={props.disabled}
                  readOnly
                  className="appearance-none w-4 h-4 min-w-4 min-h-4 border border-neutral-300 rounded bg-white checked:bg-neutral-800 checked:border-neutral-800 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition ease-in-out duration-150 cursor-pointer mt-0.5 disabled:opacity-60 disabled:cursor-not-allowed relative
                  checked:after:content-[''] checked:after:absolute checked:after:left-1.25 checked:after:top-0.5 checked:after:w-1.25 checked:after:h-2.25 checked:after:border-white checked:after:border-r-2 checked:after:border-b-2 checked:after:rotate-45"
                />
              );
            }
            return <input {...props} />;
          },

          // Text Styling
          p: ({ children }) => (
            <p className="mb-2 text-sm leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-neutral-900">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-neutral-600">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-200 pl-4 py-1 my-2 bg-gray-50 italic text-neutral-600 rounded-r">
              {children}
            </blockquote>
          ),

          // Link Styling - Force external new tab
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              {children}
              <ExternalLink className="w-3 h-3 inline-block" />
            </a>
          ),

          // Code Styling
          code(props) {
            const { children, className, node, ref, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");

            if (isInline) {
              return (
                <code
                  {...rest}
                  className="px-1.5 py-0.5 bg-gray-100 text-neutral-800 rounded font-mono text-xs"
                >
                  {children}
                </code>
              );
            }

            // Block Code
            const codeString = String(children).replace(/\n$/, "");
            const uniqueId = Math.random().toString(36).substr(2, 9);
            const isCopied = copiedCode === uniqueId;
            const language = match ? match[1] : "";

            return (
              <div className="relative group my-3">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded shadow-sm border border-gray-200 z-10">
                  <button
                    onClick={() => handleCopyCode(codeString, uniqueId)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden text-xs font-mono leading-relaxed relative">
                  <SyntaxHighlighter
                    {...rest}
                    style={vscDarkPlus}
                    language={language}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: "0.75rem",
                      backgroundColor: "#1e1e1e", // Match vscDarkPlus bg
                    }}
                    codeTagProps={{
                      style: { fontFamily: "inherit" },
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          },

          // Table Styling
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border rounded border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 last:border-r-0">
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
