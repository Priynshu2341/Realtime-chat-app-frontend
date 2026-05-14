import {
  Check,
  CheckCheck,
  Search,
  MessageCircle,
  MoreVertical,
  ArrowLeft
} from "lucide-react";

import "../../styles/chat-page.css";

import { useMemo, useState, useEffect, useRef } from "react";

import { useAuth } from "../../auth/AuthContext";

import { useNavigate } from "react-router";

export function ChatUI({
  chats,
  selectedChat,
  messages,
  newMessage,
  onSelectChat,
  onSendMessage,
  onChangeMessage,
  currentUserId,
  chatRef,
  messagesEndRef,
  isTyping,
  previewUrl,
  onImageSelect,
  clearSelectedImage
}) {
  const navigate = useNavigate();

  const { logout } = useAuth();

  const [search, setSearch] = useState("");

  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef(null);

  /* CLOSE MENU OUTSIDE CLICK */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* FILTER CHATS */

  const filteredChats = useMemo(() => {
    return chats.filter((chat) =>
      chat.otherUserName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [chats, search]);

  /* OWN MESSAGE */

  const isMine = (msg) => Number(msg.senderId) === Number(currentUserId);

  /* STATUS ICON */

  const renderStatus = (msg) => {
    if (!isMine(msg)) return null;

    switch (msg.messageStatus) {
      case "SENT":
        return <Check size={16} className="message-status-icon" />;

      case "DELIVERED":
        return <CheckCheck size={16} className="message-status-icon" />;

      case "READ":
        return <CheckCheck size={16} className="read-icon" />;

      default:
        return null;
    }
  };

  return (
    <div className={`chat-page ${selectedChat ? "chat-open" : ""}`}>
      {/* SIDEBAR */}

      <div className="chat-sidebar">
        {/* HEADER */}

        <div className="chat-sidebar-header">
          <h2 className="sidebar-title">Chats</h2>

          <div className="sidebar-actions" ref={menuRef}>
            {/* NEW CHAT */}

            <button
              className="sidebar-icon-btn"
              title="New Chat"
              onClick={() => navigate("/search")}
            >
              <MessageCircle size={18} />
            </button>

            {/* MENU */}

            <button
              className="sidebar-icon-btn"
              title="Menu"
              onClick={() => setShowMenu((prev) => !prev)}
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div className="sidebar-menu">
                <button
                  className="sidebar-menu-item"
                  onClick={() => {
                    navigate("/search");

                    setShowMenu(false);
                  }}
                >
                  New Chat
                </button>

                <button className="sidebar-menu-item" onClick={logout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SEARCH */}

        <div className="sidebar-search-wrapper">
          <div className="sidebar-search-box">
            <Search size={16} className="search-icon" />

            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sidebar-search-input"
            />
          </div>
        </div>

        {/* CHAT LIST */}

        <div className="chat-list">
          {filteredChats.length === 0 && (
            <div className="empty-search-state">No chats found</div>
          )}

          {filteredChats.map((chat) => (
            <div
              key={chat.chatId}
              className={`chat-item ${
                selectedChat?.chatId === chat.chatId ? "active" : ""
              }`}
              onClick={() => onSelectChat(chat)}
            >
              <div className="chat-info">
                <div className="main-info">
                  <div className="user-title-wrapper">
                    <h4 className="chat-name">{chat.otherUserName}</h4>

                    <span
                      className={
                        chat.isOtherUserOnline ? "online-dot" : "offline-dot"
                      }
                    />
                  </div>

                  {chat.unread > 0 && (
                    <span className="badge">{chat.unread}</span>
                  )}
                </div>

                <p className="last-msg">{chat.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}

      <div className="chat-main">
        {!selectedChat ? (
          <div className="empty-chat">
            <h1>Chat is Empty</h1>

            <button
              className="empty-chat-button"
              onClick={() => navigate("/search")}
            >
              Search Users
            </button>
          </div>
        ) : (
          <>
            {/* CHAT HEADER */}

            <div className="chat-main-header">
              <div className="header-user-info-wrapper">
                {/* MOBILE BACK */}

                <button
                  className="mobile-back-btn"
                  onClick={() => onSelectChat(null)}
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="header-user-info">
                  <h3 className="chat-username">
                    {selectedChat.otherUserName}
                  </h3>

                  <p className="online-status">
                    {selectedChat.isOtherUserOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </div>

            {/* MESSAGES */}

            <div className="chat-messages" ref={chatRef}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${isMine(msg) ? "sent" : "received"}`}
                >
                  <div className="message-content">
                    {msg.mediaUrl && (
                      <img
                        src={`http://localhost:8080${msg.mediaUrl}`}
                        alt="chat"
                        className="chat-image"
                      />
                    )}

                    {msg.content?.trim() && (
                      <p className="message-text">{msg.content}</p>
                    )}

                    <div className="message-meta">{renderStatus(msg)}</div>
                  </div>
                </div>
              ))}

              {/* TYPING */}

              {isTyping && (
                <div className="typing-wrapper">
                  <div className="typing-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* IMAGE PREVIEW */}

            {previewUrl && (
              <div className="image-preview-wrapper">
                <img src={previewUrl} alt="preview" className="image-preview" />

                <button
                  className="remove-image-btn"
                  onClick={clearSelectedImage}
                >
                  ✕
                </button>
              </div>
            )}

            {/* INPUT */}

            <div className="message-input-div">
              <label htmlFor="image-input" className="image-upload-btn">
                +
              </label>

              <input
                id="image-input"
                type="file"
                accept="image/*"
                hidden
                onChange={onImageSelect}
              />

              <input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => onChangeMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSendMessage();
                  }
                }}
              />

              <button onClick={onSendMessage}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
