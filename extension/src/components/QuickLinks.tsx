import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowRightLeft,
  Loader2,
  Trash2,
  Link as LinkIcon,
  ExternalLink,
  Lock,
  Pencil,
} from "lucide-react";
import { useQuickLinks } from "../hooks/useQuickLinks";

interface QuickLinksProps {
  currentDomain: string | null;
}

export default function QuickLinks({ currentDomain }: QuickLinksProps) {
  const { links, loading, addLink, updateLink, deleteLink } =
    useQuickLinks(currentDomain);
  const [isOpen, setIsOpen] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLink, setEditingLink] = useState<(typeof links)[0] | null>(
    null,
  );

  const [formUrl, setFormUrl] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formType, setFormType] = useState<"related" | "env">("related");
  const [submitting, setSubmitting] = useState(false);

  // Helper to handle Env link click
  const handleLinkClick = (e: React.MouseEvent, link: (typeof links)[0]) => {
    if (link.type === "env") {
      e.preventDefault();

      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const currentTab = tabs[0];
          if (!currentTab?.id || !currentTab.url) {
            window.open(link.target_url, "_blank");
            return;
          }

          try {
            const currentUrlObj = new URL(currentTab.url);
            const targetOrigin = new URL(link.target_url).origin;
            const newUrl =
              targetOrigin +
              currentUrlObj.pathname +
              currentUrlObj.search +
              currentUrlObj.hash;

            chrome.tabs.update(currentTab.id, { url: newUrl });
          } catch (err) {
            console.error("Navigation failed", err);
            window.open(link.target_url, "_blank");
          }
        });
      } else {
        try {
          const targetOrigin = new URL(link.target_url).origin;
          const newUrl =
            targetOrigin + window.location.pathname + window.location.search;
          window.location.href = newUrl;
        } catch (e) {
          window.location.href = link.target_url;
        }
      }
    }
  };

  const startAdding = () => {
    setEditingLink(null);
    setFormUrl("");
    setFormLabel("");
    setFormType("related");
    setIsAdding(true);
  };

  const startEditing = (link: (typeof links)[0]) => {
    setEditingLink(link);
    setFormUrl(link.target_url);
    setFormLabel(link.label);
    setFormType(link.type as "related" | "env");
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingLink(null);
    setFormUrl("");
    setFormLabel("");
    setFormType("related");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim() || !formLabel.trim() || !currentDomain) return;

    setSubmitting(true);
    try {
      if (editingLink) {
        await updateLink(editingLink.id, {
          label: formLabel,
          target_url: formUrl,
          type: formType,
        });
      } else {
        await addLink({
          label: formLabel,
          target_url: formUrl,
          type: formType,
        });
      }
      cancelForm();
    } catch (err) {
      console.error("Failed to save link", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentDomain) return null;

  return (
    <div className="border-b border-gray-200 bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Quick Links</span>
          {links.length > 0 && (
            <span className="bg-gray-100 text-gray-500 px-1.5 rounded-full text-[10px]">
              {links.length}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="pb-3 px-3">
          <div className="space-y-1">
            {loading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : links.length === 0 ? (
              !isAdding && (
                <div className="text-center text-gray-400 text-xs py-2 italic">
                  No links added yet.
                </div>
              )
            ) : (
              links.map((link) => {
                const isIncoming = link.domain !== currentDomain;
                return (
                  <div
                    key={link.id}
                    className="group flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors text-sm"
                  >
                    <a
                      href={link.target_url}
                      target={link.type === "related" ? "_blank" : undefined}
                      rel={
                        link.type === "related"
                          ? "noopener noreferrer"
                          : undefined
                      }
                      onClick={(e) => handleLinkClick(e, link)}
                      className="flex items-center gap-2 flex-1 min-w-0"
                      title={link.target_url}
                    >
                      {link.type === "related" ? (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${new URL(link.target_url).hostname}`}
                          alt=""
                          className="w-4 h-4 rounded-sm shrink-0"
                        />
                      ) : (
                        <ArrowRightLeft className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                      <span className="truncate text-gray-700">
                        {link.label}
                      </span>

                      {link.type === "related" && (
                        <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                      )}

                      <div className="flex items-center gap-1">
                        {link.type === "env" && (
                          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 ml-1 shrink-0 border border-gray-100 px-1 rounded">
                            ENV
                            {isIncoming && <Lock className="w-3 h-3" />}
                          </span>
                        )}
                      </div>
                    </a>

                    {!isIncoming && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(link)}
                          className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isAdding ? (
              <form
                onSubmit={handleSubmit}
                className="mt-2 text-xs border border-gray-200 rounded-md p-2 bg-gray-50"
              >
                <div className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    required
                    placeholder="URL (e.g. https://doc.com)"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-black bg-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Label (e.g. API Docs)"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-black bg-white"
                  />
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="linkType"
                        checked={formType === "related"}
                        onChange={() => setFormType("related")}
                        className="text-neutral-700 focus:ring-neutral-700"
                      />
                      <span>Related</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="linkType"
                        checked={formType === "env"}
                        onChange={() => setFormType("env")}
                        className="text-neutral-700 focus:ring-neutral-700"
                      />
                      <span>Env Switch</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={cancelForm}
                      className="px-2 py-1 text-gray-500 hover:text-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-2 py-1 bg-neutral-700 text-white rounded hover:bg-neutral-700 disabled:opacity-50"
                    >
                      {submitting
                        ? "Saving..."
                        : editingLink
                          ? "Update"
                          : "Add"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <button
                onClick={startAdding}
                className="w-full text-left p-2 text-xs text-gray-400 hover:text-black hover:bg-gray-50 rounded flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Link
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

