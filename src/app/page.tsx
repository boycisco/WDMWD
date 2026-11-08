import { ToastProvider } from '@/components/ui/toast';
import { ChatApp } from '@/components/chat/chat';

export default function Home() {
  return (
    <ToastProvider>
      <ChatApp />
    </ToastProvider>
  );
}
