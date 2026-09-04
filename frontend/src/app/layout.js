import "./globals.css";
import HeaderNav from "@/components/HeaderNav";

export const metadata = {
  title: "RazorRecover — Autonomous AI Revenue Recovery Agent",
  description: "Detects revenue slipping away, diagnoses causes, executes bounded recovery actions, verifies payment evidence, and measures actual revenue recovered across a batch.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#140e0a] text-sand-100 antialiased min-h-screen flex flex-col">
        {/* Navigation Header */}
        <HeaderNav />

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-sand-200/10 py-6 text-center text-xs text-sand-400 bg-[#0e0a07]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div>
              RazorRecover — AI Revenue Recovery Agent • Track 03: AI Revenue Recovery
            </div>
            <div className="flex items-center space-x-4">
              <span>Deterministic Policy Engine Active</span>
              <span>•</span>
              <span>60-Case Batch Evaluation</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
