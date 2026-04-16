import { useEffect, useRef, useState } from "react";
import { getChats, getMessages } from "../../api/chatAndMsgApi";
import "../../styles/chat-page.css";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router";
import {
  connectWebsocket,
  subscribeToChat,
  sendMessageToUser,
} from "../../api/websocket";

export function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageError, setMessageError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const { accessToken, loggedInUserId } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const currentUserId = loggedInUserId != null ? Number(loggedInUserId) : null;
  console.log("currentsuerid",currentUserId);

  
  async function fetchMessages(chat) {
    if (!chat) return;
    const chatKey = chat.chatKey;
    try {
      const res = await getMessages({ chatKey });
      setMessages(res);
    } catch (e) {
      setMessageError(
        e?.response?.data?.message || e?.message || "Failed to load Messages"
      );
    }
  }

  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
      return;
    }

    connectWebsocket(() => {
      console.log("WebSocket Ready");
      setIsConnected(true);
    }, accessToken);
  }, [accessToken, navigate]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const chatData = await getChats();
        setChats(chatData);

        if (chatData.length > 0) {
          const firstChat = chatData[0];
          setSelectedChat(firstChat);
          setSelectedChatId(firstChat.chatId);
          fetchMessages(firstChat);
        }
      } catch (e) {
        setMessageError(
          e?.response?.data?.message || e?.message || "Failed to load chats"
        );
      }
    };

    fetchChats();
  }, []);

  useEffect(() => {
    if (!selectedChatId || !isConnected) return;

    console.log("📡 Subscribing to:", selectedChatId);

    const subscription = subscribeToChat(selectedChatId, (message) => {
      console.log("Received:", message);
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      console.log("Unsubscribing from:", selectedChatId);
      subscription?.unsubscribe();
    };
  }, [selectedChatId, isConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setSelectedChatId(chat.chatId);
    fetchMessages(chat);
    setMessageError("");
  };

  const handleSendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !selectedChatId) return;

    sendMessageToUser({
      receiverId: selectedChat.otherUserId,
      content: trimmed,
    });

    setNewMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isMessageSentByMe = (msg) => {
    const senderId = msg.senderId;
    console.log("senderId",senderId);
    const result = Number(senderId) === Number(currentUserId);
    return result;
  };

  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">Chats</div>

        {chats.map((chat) => (
          <div
            key={chat.chatId}
            className={`chat-item ${
              selectedChat?.chatId === chat.chatId ? "active" : ""
            }`}
            onClick={() => handleSelectChat(chat)}
          >
            <div className="chat-avatar">
              {chat?.otherUserName?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="chat-info">
              <h4>{chat?.otherUserName}</h4>
              <p>{chat?.lastMessage}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-main-header">
              <div className="chat-avatar">
                {selectedChat?.otherUserName?.charAt(0)?.toUpperCase()}
              </div>
              <h3>{selectedChat?.otherUserName}</h3>
            </div>

            <div className="chat-messages">
              {messageError && (
                <div className="chat-error">{messageError}</div>
              )}

              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isSent = isMessageSentByMe(msg);
                  return (
                    <div
                      key={msg.id}
                      className={`message ${isSent ? "sent" : "received"}`}
                    >
                      <p>{msg.content}</p>
                      <small>{new Date(msg.createdAt).toLocaleString()}</small>
                    </div>
                  );
                })
              ) : (
                <div className="chat-empty">No messages</div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-div">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="chat-empty">Select a chat to start messaging</div>
        )}
      </div>
    </div>
  );
}