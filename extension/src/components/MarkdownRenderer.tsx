import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, ExternalLink } from "lucide-react";

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleCopyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <div className={`prose prose-sm prose-neutral max-w-none ${className} break-words`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Header Styling
                    h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,

                    // List Styling
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,

                    // Text Styling
                    p: ({ children }) => <p className="mb-2 text-sm leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-neutral-600">{children}</em>,
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
                                <code {...rest} className="px-1.5 py-0.5 bg-gray-100 text-neutral-800 rounded font-mono text-xs">
                                    {children}
                                </code>
                            );
                        }

                        // Block Code
                        const codeString = String(children).replace(/\n$/, "");
                        const uniqueId = Math.random().toString(36).substr(2, 9);
                        const isCopied = copiedCode === uniqueId;

                        return (
                            <div className="relative group my-3">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded shadow-sm border border-gray-200 z-10">
                                    <button
                                        onClick={() => handleCopyCode(codeString, uniqueId)}
                                        className="p-1.5 text-neutral-500 hover:text-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Copy code"
                                    >
                                        {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <pre {...rest} className="p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed relative">
                                    <code>{children}</code>
                                </pre>
                            </div>
                        );
                    },

                    // Table Styling
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-3 border rounded border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>,
                    tr: ({ children }) => <tr>{children}</tr>,
                    th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 last:border-r-0">{children}</td>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
