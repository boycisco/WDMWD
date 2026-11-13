// SPDX-License-Identifier: AGPL-3.0-only
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#070B14] text-[#F0F4FF]">
      <h2 className="text-2xl font-bold font-heading mb-2">404 - Not Found</h2>
      <p className="text-sm text-[#94A3C8] mb-4">The requested page or resource could not be found.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-[#0052FF] text-white text-xs font-medium hover:bg-[#0045D8] transition-colors shadow-[0_0_15px_rgba(0,82,255,0.4)]"
      >
        Return to Home
      </Link>
    </div>
  );
}
