'use client';

import React, { useEffect, useState } from 'react';
import { X, MonitorPlay, LayoutList, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { SettingsResponse } from '@/types/api';
import { useToast } from '@/components/ui/toast';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getSettings()
      .then((data) => setSettings(data))
      .catch(() => showToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, [open, showToast]);

  const handleToggle = async (key: keyof SettingsResponse['config']) => {
    if (!settings || saving) return;
    
    const previous = settings.config[key];
    const updated = { ...settings, config: { ...settings.config, [key]: !previous } };
    setSettings(updated);
    setSaving(true);

    try {
      await api.updateSettings({ [key]: !previous });
    } catch {
      setSettings(settings); // Revert on failure
      showToast('Failed to save preference', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0E1426]/95 border border-[#253343] rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1E2945]/60">
          <h2 className="font-heading font-semibold text-xl text-[#F1F5F9] tracking-tight">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#1C2938] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[#A0AEC0]">
              Loading preferences...
            </div>
          ) : settings ? (
            <>
              {/* Chat Preferences */}
              <div>
                <h3 className="text-[11px] font-mono tracking-wider text-[#627299] uppercase mb-3 px-1 font-semibold">
                  Chat Preferences
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#111821] border border-[#1E2945]/50 hover:border-[#2A3B66] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-[#0052FF]/10">
                        <MonitorPlay className="w-5 h-5 text-[#0052FF]" />
                      </div>
                      <div>
                        <div className="text-[15px] font-medium text-[#F1F5F9]">Stream Responses</div>
                        <div className="text-[13px] text-[#A0AEC0] mt-0.5">Show text as it is generated.</div>
                      </div>
                    </div>
                    {/* iOS-style toggle */}
                    <button
                      onClick={() => handleToggle('streamResponses')}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ease-in-out ${
                        settings.config.streamResponses ? 'bg-[#0052FF]' : 'bg-[#253343]'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                          settings.config.streamResponses ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#111821] border border-[#1E2945]/50 hover:border-[#2A3B66] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-[#B7F36B]/10">
                        <LayoutList className="w-5 h-5 text-[#B7F36B]" />
                      </div>
                      <div>
                        <div className="text-[15px] font-medium text-[#F1F5F9]">Auto-expand Activity</div>
                        <div className="text-[13px] text-[#A0AEC0] mt-0.5">Automatically show steps.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('autoExpandActivity')}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ease-in-out ${
                        settings.config.autoExpandActivity ? 'bg-[#0052FF]' : 'bg-[#253343]'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                          settings.config.autoExpandActivity ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* About */}
              <div>
                <h3 className="text-[11px] font-mono tracking-wider text-[#627299] uppercase mb-3 px-1 font-semibold">
                  About WDMWD
                </h3>
                <div className="p-4 rounded-2xl bg-[#111821] border border-[#1E2945]/50 space-y-3">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-[#A0AEC0] flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" /> Network
                    </span>
                    <span className="text-[#F1F5F9] font-medium">{settings.chainName}</span>
                  </div>
                  <div className="h-px w-full bg-[#1E2945]/50" />
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-[#A0AEC0]">Version</span>
                    <span className="text-[#F1F5F9] font-mono text-[13px]">v0.1.0 (Beta)</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-[#F17878]">
              Failed to load settings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}