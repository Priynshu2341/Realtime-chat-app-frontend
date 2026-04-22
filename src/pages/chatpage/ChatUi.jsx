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
  messagesEndRef
}) {

  const isMine = (msg) =>
    Number(msg.senderId) === Number(currentUserId);

  const renderStatus = (msg) => {
    if (!isMine(msg)) return null;

    switch (msg.messageStatus) {
      case "SENT":
        return <Check size={16} />;

      case "DELIVERED":
        return <CheckCheck size={16} />;

      case "READ":
        return (
          <CheckCheck className="read-icon"
            size={16}
            style={{ color: "#FFD700" }} // ✅ FIX
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
        {chats.map(chat => (
          <div
            key={chat.chatId}
            className={`chat-item ${
              selectedChat?.chatId === chat.chatId ? "active" : ""
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <div className="chat-info">
              <div className="main-info">
                <h4>{chat.otherUserName}</h4>

                {chat.unread > 0 && (
                  <span className="badge">{chat.unread}</span>
                )}
              </div>

              <p className="last-msg">{chat.lastMessage}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div className="chat-main">

        {!selectedChat ? (
          <div className="empty-chat">
            Select a chat to start messaging
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="chat-main-header">
              <h3>{selectedChat.otherUserName}</h3>
            </div>

            {/* MESSAGES */}
            <div className="chat-messages" ref={chatRef}>
              {messages.map(msg => (
                <div
                  key={`${msg.id}-${msg.messageStatus}`}
                  className={`message ${
                    isMine(msg) ? "sent" : "received"
                  }`}
                >
                  <div className="message-content">
                    <span>{msg.content}</span>
                    {renderStatus(msg)}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div className="message-input-div">
              <input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => onChangeMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSendMessage();
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