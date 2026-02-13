import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { LogOut, Settings } from "lucide-react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";

interface HeaderProps {
  url: string;
  title: string;
  domain: string; // Used for settings key
  session: Session;
  onLogout: () => void;
}

interface DomainSettings {
  color: string;
  label: string;
}

const COLORS = [
  { name: "Green", value: "green-300", hex: "#86efac" },
  { name: "Blue", value: "blue-300", hex: "#93c5fd" },
  { name: "Red", value: "red-300", hex: "#fca5a5" },
  { name: "Yellow", value: "yellow-300", hex: "#fde047" },
  { name: "Purple", value: "purple-300", hex: "#d8b4fe" },
];

export default function Header({
  url,
  title,
  domain,
  session,
  onLogout,
}: HeaderProps) {
  const [settings, setSettings] = useState<DomainSettings | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editColor, setEditColor] = useState("green-500");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!domain || !session) return;
    fetchSettings();
  }, [domain, session]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("sitecue_domain_settings")
      .select("*")
      .eq("domain", domain)
      .maybeSingle();

    if (data) {
      setSettings({ color: data.color ?? "", label: data.label ?? "" });
      setEditColor(data.color || "green-500");
      setEditLabel(data.label || "");
    } else {
      setSettings(null);
      setEditColor("green-500");
      setEditLabel("");
    }
  };

  const handleSave = async () => {
    if (!domain) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("sitecue_domain_settings").upsert(
        {
          user_id: session.user.id,
          domain: domain,
          color: editColor,
          label: editLabel.trim() || null,
        },
        { onConflict: "user_id, domain" },
      );

      if (error) throw error;
      setIsSettingsOpen(false);
      fetchSettings();
      toast.success("Settings saved");
    } catch (error) {
      console.error("Failed to save domain settings", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-neutral-700 shadow-sm sticky top-0 z-10">
      <div className="flex justify-between items-center gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            {/* Indicator Dot */}
            <div
              className={`w-2 h-2 shrink-0 rounded-full bg-${settings?.color?.replace("-500", "-500") || "green-500"} ${settings?.color ? "" : "animate-pulse"}`}
              style={{
                backgroundColor: COLORS.find((c) => c.value === settings?.color)
                  ?.hex,
              }}
            />
            <span className="truncate" title={title || "SiteCue"}>
              {title || "SiteCue"}
            </span>
            {settings?.label && (
              <span className="text-[10px] bg-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-600 font-mono shrink-0">
                {settings.label}
              </span>
            )}
          </h1>
          <p className="text-xs text-neutral-400 truncate" title={url}>
            {url || "Waiting..."}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-full transition-colors ${isSettingsOpen ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"}`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="p-1.5 text-neutral-400 hover:text-white shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Popup / Expandable Area */}
      {isSettingsOpen && (
        <div className="mt-3 pt-3 border-t border-neutral-700 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-neutral-300 mb-1.5 block">
                Label
              </label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value.slice(0, 10))}
                placeholder="e.g. PROD, DEV"
                className="w-full text-xs bg-neutral-900 text-white border border-neutral-600 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-500 placeholder-neutral-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-300 mb-1.5 block">
                Color
              </label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setEditColor(c.value)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${editColor === c.value ? "border-transparent ring-2 ring-white ring-offset-2 ring-offset-neutral-700 scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 bg-neutral-400 text-neutral-700 text-xs rounded hover:bg-white disabled:opacity-50 flex items-center gap-1"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
