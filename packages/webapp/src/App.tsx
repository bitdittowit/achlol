import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initTelegramWebApp } from "./lib/telegram";
import { ListPage } from "./pages/ListPage.tsx";
import { CreatePage } from "./pages/CreatePage.tsx";
import { PrankPage } from "./pages/PrankPage.tsx";

export default function App() {
  useEffect(() => {
    initTelegramWebApp();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 p-4 pb-8">
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/new" element={<CreatePage />} />
          <Route path="/prank/:id" element={<PrankPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
