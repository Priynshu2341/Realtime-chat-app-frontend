
import { Check, CheckCheck } from "lucide-react";
import "../../styles/chat-page.css";

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
  const isMine = (msg) =>
    Number(msg.senderId) === Number(currentUserId);

  const renderStatus = (msg) => {
    if (!isMine(msg)) return null;

    switch (msg.messageStatus) {
      case "SENT":
        return (
          <Check
            size={16}
            className="message-status-icon"
          />
        );

      case "DELIVERED":
        return (
          <CheckCheck
            size={16}
            className="message-status-icon"
          />
        );

      case "READ":
        return (
          <CheckCheck
            size={16}
            className="read-icon"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="chat-page">
      {/* SIDEBAR */}

      <div className="chat-sidebar">
        {chats.map((chat) => (
          <div
            key={chat.chatId}
            className={`chat-item ${
              selectedChat?.chatId === chat.chatId
                ? "active"
                : ""
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <div className="chat-info">
              <div className="main-info">
                <div className="user-title-wrapper">
                  <h4 className="chat-name">
                    {chat.otherUserName}
                  </h4>

                  <span
                    className={
                      chat.isOtherUserOnline
                        ? "online-dot"
                        : "offline-dot"
                    }
                  />
                </div>

                {chat.unread > 0 && (
                  <span className="badge">
                    {chat.unread}
                  </span>
                )}
              </div>

              <p className="last-msg">
                {chat.lastMessage}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN */}

      <div className="chat-main">
        {!selectedChat ? (
          <div className="empty-chat">
            Select a chat
          </div>
        ) : (
          <>
            {/* HEADER */}

            <div className="chat-main-header">
              <div className="header-user-info">
                <h3 className="chat-username">
                  {selectedChat.otherUserName}
                </h3>

                <p className="online-status">
                  {selectedChat.isOtherUserOnline
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </div>

            {/* MESSAGES */}

            <div
              className="chat-messages"
              ref={chatRef}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${
                    isMine(msg)
                      ? "sent"
                      : "received"
                  }`}
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
                      <p className="message-text">
                        {msg.content}
                      </p>
                    )}

                    <div className="message-meta">
                      {renderStatus(msg)}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="typing-wrapper">
                  <div className="typing-bubble">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* IMAGE PREVIEW */}

            {previewUrl && (
              <div className="image-preview-wrapper">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="image-preview"
                />

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
              <label
                htmlFor="image-input"
                className="image-upload-btn"
              >
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
                onChange={(e) =>
                  onChangeMessage(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSendMessage();
                  }
                }}
              />

              <button onClick={onSendMessage}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

