'use client';

import React, { useState } from 'react';
import { Download, Check, Share, Smartphone } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export default function NativeInstallButton() {
  const { isInstallable, isInstalled, isIos, isStandalone, promptInstall } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidTip, setShowAndroidTip] = useState(false);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (isInstallable) {
      const success = await promptInstall();
      if (!success) {
        setShowAndroidTip(true);
      }
    } else {
      setShowAndroidTip(true);
    }
  };

  if (isStandalone || isInstalled) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 bg-zinc-200 text-zinc-900 rounded-lg text-[11px] font-medium border border-zinc-300 select-none shrink-0"
        title="App is installed on your device"
      >
        <Check className="w-3 h-3 text-zinc-900 shrink-0" />
        <span className="hidden sm:inline">Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        aria-label="Install App"
        title="Install this application directly to your Android or mobile device"
        className="group relative flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 active:scale-95 transition-all shadow-sm border border-zinc-900 shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" />
        <span className="hidden sm:inline">Install</span>
        {isInstallable && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </button>

      {/* Android Info Modal */}
      {showAndroidTip && !isInstallable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-zinc-100 rounded-xl">
                <Smartphone className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Android Native Install</h3>
                <p className="text-xs text-zinc-500">Chrome PWA Integration</p>
              </div>
            </div>

            <p className="text-xs text-zinc-800 leading-relaxed mb-4">
              In <strong>Android Chrome</strong>, this app qualifies for direct device installation.
            </p>

            <div className="space-y-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs text-zinc-800 mb-4">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-zinc-900">1.</span>
                <span>Tap Chrome menu <strong className="text-zinc-900">&vellip;</strong> (top right).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-zinc-900">2.</span>
                <span>Select <strong className="text-zinc-900">&ldquo;Install app&rdquo; / &ldquo;Add to Home screen&rdquo;</strong>.</span>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidTip(false)}
              className="w-full py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-zinc-100 rounded-xl">
                <Share className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Install on iOS Safari</h3>
                <p className="text-xs text-zinc-500">Add to Home Screen</p>
              </div>
            </div>

            <div className="space-y-2.5 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 mb-4">
              <div className="flex items-start gap-2">
                <span className="font-bold text-zinc-900">1.</span>
                <span>Tap the <strong className="text-zinc-900">Share</strong> icon at the bottom of Safari.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-zinc-900">2.</span>
                <span>Select <strong className="text-zinc-900">&ldquo;Add to Home Screen&rdquo;</strong>.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
