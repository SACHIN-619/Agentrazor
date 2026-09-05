import "./globals.css";
import HeaderNav from "@/components/HeaderNav";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "RazorRecover — Autonomous AI Revenue Recovery Agent",
  description: "Detects revenue slipping away, diagnoses causes, executes bounded recovery actions, verifies payment evidence, and measures actual revenue recovered across a batch.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#140e0a] text-sand-100 antialiased min-h-screen flex flex-col">
        {/* Top Header Navigation (for Public & Demo pages) */}
        <HeaderNav />

        {/* Collapsible Left Sidebar (for Authenticated Workspace pages) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:pl-[72px] transition-all duration-300">
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
            {children}
          </main>

          {/* Global Footer */}
          <footer className="border-t border-sand-200/10 py-5 text-center text-xs text-sand-400 bg-[#0e0a07] mt-auto">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
              <div>
                RazorRecover — AI Revenue Recovery Agent • Track 03: AI Revenue Recovery
              </div>
              <div className="flex items-center space-x-4">
                <span>Deterministic Policy Engine Active</span>
                <span>•</span>
                <span>Razorpay Test Mode Ready</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
