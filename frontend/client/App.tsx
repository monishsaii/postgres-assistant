import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { DBProvider } from "../src/src/context/DBContext";
import HomePage from "../src/src/pages/HomePage";
import SettingsPage from "../src/src/pages/SettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DBProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground">
            <nav className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur dark:bg-background/70">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <Link to="/" className="text-sm font-semibold">
                  🗺️ Postgres Assistant
                </Link>
                <div className="flex items-center gap-4 text-sm">
                  <Link to="/" className="hover:underline">
                    Home
                  </Link>
                  <Link to="/settings" className="hover:underline">
                    Settings
                  </Link>
                </div>
              </div>
            </nav>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </DBProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
