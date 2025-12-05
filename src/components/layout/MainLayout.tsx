import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 lg:px-8 max-w-[1920px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
