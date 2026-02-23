import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initTelegramWebApp } from "./lib/telegram";
import { Layout } from "./components/Layout";
import { ListPage } from "./pages/ListPage";
import { CreatePage } from "./pages/CreatePage";
import { PrankPage } from "./pages/PrankPage";
import { FriendsPage } from "./pages/FriendsPage";
import { FriendPranksPage } from "./pages/FriendPranksPage";
import { FeedPage } from "./pages/FeedPage";

export default function App() {
  useEffect(() => {
    initTelegramWebApp();
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/new" element={<CreatePage />} />
          <Route path="/prank/:id" element={<PrankPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friend/:userId" element={<FriendPranksPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
