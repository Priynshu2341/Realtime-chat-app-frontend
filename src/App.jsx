import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/authpages/RegisterPage";
import "./App.css";
import { Route, Routes } from "react-router";
import { ChatPage } from "./pages/chatpage/ChatPage";
import ChatSearch from "./pages/chatpage/ChatSearch";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />}></Route>
      <Route path="/register" element={<RegisterPage />}></Route>
      <Route path="/" element={<ChatPage />}></Route>
      <Route path="/search" element={<ChatSearch />}></Route>
    </Routes>
  );
}

export default App;
