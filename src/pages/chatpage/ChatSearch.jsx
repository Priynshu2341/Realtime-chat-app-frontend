import { useEffect, useState } from "react";

import {
  searchUserByEmail,
  searchAlluser,
  sendMessage
} from "../../api/chatAndMsgApi";

import "../../styles/chat-search.css";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router";

function ChatSearch() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { loggedInUserId } = useAuth();

  const navigate = useNavigate();

  const currentUserId = Number(loggedInUserId);

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    try {
      setLoading(true);

      const data = await searchAlluser();

      setUsers(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      loadAllUsers();
      return;
    }

    try {
      setLoading(true);
      const data = await searchUserByEmail(search);
      if (!data) {
        setUsers([]);
        return;
      }
      setUsers(Array.isArray(data) ? data : [data]);
    } catch (error) {
      console.error(error);

      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async ({ recieverId }) => {
    const res = await sendMessage({ receiverId: recieverId, content: "Hi" });
    navigate("/");
    return res;
  };

  return (
    <div className="chat-search-page">
      <div className="chat-search-header">
        <h2 className="chat-btn" onClick={() => navigate("/")}>
          Chats
        </h2>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="chat-search-input"
        />

        <button onClick={handleSearch} className="chat-search-button">
          Search
        </button>
      </div>

      <div className="chat-search-results">
        {loading && <p className="chat-search-loading">Loading...</p>}

        {!loading &&
          users.map((user) => (
            <div key={user.userId} className="chat-search-user">
              <div className="chat-search-left">
                <div className="chat-search-avatar">
                  {user.email?.charAt(0).toUpperCase()}
                </div>

                <div className="chat-search-info">
                  <p className="chat-search-email">{user.email}</p>
                  <p className="chat-search-name">
                    {user.firstname} {user.lastname}
                  </p>
                  <p>{currentUserId === user.userId ? "You" : ""}</p>
                </div>
              </div>

              <button
                className="send-message-btn"
                disabled={user.userId === currentUserId}
                onClick={() => handleSendMessage({ recieverId: user.userId })}
              >
                Send Hi
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

export default ChatSearch;
