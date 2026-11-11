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
      setSettings(settings);
      showToast('Failed to save preference', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0B0F14] sm:bg-black/60 sm:backdrop-blur-sm flex sm:items-center justify-center animate-in fade-in duration-200">
      
      {/* Container: Full screen on mobile, modal on desktop */}
      <div className="w-full h-full sm:h-auto sm:max-w-md bg-[#0B0F14] sm:bg-[#0E1426] sm:rounded-3xl sm:border sm:border-[#253343] sm:shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0">
          <h2 className="font-heading font-semibold text-xl text-[#F1F5F9] tracking-tight">Settings</h2>
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); onClose(); }}
            className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-[#A0AEC0] active:bg-[#1C2938] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-10 sm:pb-8 space-y-8">
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
                <div className="space-y-1">
                  
                  {/* Stream Responses */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <MonitorPlay className="w-5 h-5 text-[#0052FF]" />
                      <div>
                        <div className="text-[15px] text-[#F1F5F9]">Stream Responses</div>
                        <div className="text-[13px] text-[#A0AEC0]">Show text as it is generated.</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onPointerDown={() => handleToggle('streamResponses')}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                        settings.config.streamResponses ? 'bg-[#0052FF]' : 'bg-[#253343]'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          settings.config.streamResponses ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Auto Expand Activity */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <LayoutList className="w-5 h-5 text-[#B7F36B]" />
                      <div>
                        <div className="text-[15px] text-[#F1F5F9]">Auto-expand Activity</div>
                        <div className="text-[13px] text-[#A0AEC0]">Automatically show steps.</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onPointerDown={() => handleToggle('autoExpandActivity')}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                        settings.config.autoExpandActivity ? 'bg-[#0052FF]' : 'bg-[#253343]'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
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
                <div className="py-2 space-y-4">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-[#A0AEC0] flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" /> Network
                    </span>
                    <span className="text-[#F1F5F9] font-medium">{settings.chainName}</span>
                  </div>
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