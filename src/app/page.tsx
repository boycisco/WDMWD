// SPDX-License-Identifier: AGPL-3.0-only
import { ToastProvider } from '@/components/ui/toast';
import { ChatApp } from '@/components/chat/chat';

export default function Home() {
  return (
    <ToastProvider>
      <ChatApp />
    </ToastProvider>
  );
}
