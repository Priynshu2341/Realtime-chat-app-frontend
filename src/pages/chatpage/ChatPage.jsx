import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getChats, getMessages,markChatAsRead, } from "../../api/chatAndMsgApi";
import "../../styles/chat-page.css";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router";
import {
  connectWebsocket,
  subscribeToChat,
  subscribeToChatMessages,
  sendMessageToUser,
  
} from "../../api/websocket";

export function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const { accessToken, loggedInUserId } = useAuth();
  const navigate = useNavigate();

  const chatRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isProgrammaticScroll = useRef(false);
  const prevScrollHeightRef = useRef(null);
  const isPaginating = useRef(false);

  const currentUserId = Number(loggedInUserId);

  // ================= FETCH INITIAL =================
  const fetchMessages = async (chat) => {
    if (!chat) return;
    const res = await getMessages({ chatKey: chat.chatKey });
    setMessages(res.content);
    setCursor(res.nextCursor);
    setHasMore(res.hasMore);

    isProgrammaticScroll.current = true;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 150);
    });
  };

  // ================= SCROLL HANDLER =================
  const handleScroll = async (e) => {
    const container = e.target;

    if (isProgrammaticScroll.current) return;
    if (isPaginating.current) return;
    if (container.scrollHeight <= container.clientHeight) return;
    if (container.scrollTop > 50) return;
    if (!hasMore || !cursor || !selectedChat) return;
    if (loadingMore) return;

    isPaginating.current = true;
    setLoadingMore(true);

    // snapshot BEFORE state change
    prevScrollHeightRef.current = container.scrollHeight;

    try {
      const res = await getMessages({
        chatKey: selectedChat.chatKey,
        cursorTime: cursor.createdAt,
        cursorId: cursor.id,
      });

      if (!res.content || res.content.length === 0) {
        setHasMore(false);
        prevScrollHeightRef.current = null;
        isPaginating.current = false;
        return;
      }

      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const newMsgs = res.content.filter((m) => !existing.has(m.id));
        if (newMsgs.length === 0) {
          prevScrollHeightRef.current = null;
          isPaginating.current = false;
          return prev;
        }
        return [...newMsgs, ...prev];
      });

      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Pagination error", err);
      prevScrollHeightRef.current = null;
      isPaginating.current = false;
    } finally {
      setLoadingMore(false);
    }
  };

  // ================= SCROLL RESTORE =================
  // Fires synchronously after DOM update, before browser paints — zero visible jump
  useLayoutEffect(() => {
    const container = chatRef.current;
    if (!container || prevScrollHeightRef.current === null) return;

    // new total height minus old total height = height added by prepended messages
    container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;

    prevScrollHeightRef.current = null;
    isPaginating.current = false;
  }, [messages]);

  // ================= CONNECT WS =================
  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
      return;
    }
    connectWebsocket(() => setIsConnected(true), accessToken);
  }, [accessToken, navigate]);

  // ================= LOAD CHATS =================
  useEffect(() => {
    const loadChats = async () => {
      const data = await getChats();
      setChats(data);
      
      if (data.length > 0) {
        const first = data[0];
        setSelectedChat(first);
        fetchMessages(first);
      }
    };
    loadChats();
  }, []);


  useEffect(() => {
  if (!isConnected) return;

  const sub = subscribeToChat((msg) => {
    console.log("received msg",msg)
    setChats((prev) => {
      const updated = prev.map((chat) => {
        if (chat.chatId === msg.chatId) {
          return {
            ...chat,
            lastMessage: msg.content,
            createdAt: msg.createdAt,
          };
        }
        
        return chat;
      });

      const target = updated.find((c) => c.chatId === msg.chatId);
      const rest = updated.filter((c) => c.chatId !== msg.chatId);

      if (!target) return prev;

      return [target, ...rest];
    });
  });

  return () => sub?.unsubscribe();
}, [isConnected]);

  // ================= WS SUBSCRIBE =================
  useEffect(() => {
    if (!selectedChat || !isConnected) return;
    const subChatMessages = subscribeToChatMessages(selectedChat.chatId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () =>  subChatMessages?.unsubscribe();
      
    
  }, [selectedChat, isConnected]);

  // ================= AUTO SCROLL for new messages only =================
  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    // never auto-scroll during pagination
    if (isPaginating.current || prevScrollHeightRef.current !== null) return;
    if (loadingMore) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + 80;

    if (isNearBottom) {
      isProgrammaticScroll.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 150);
    }
  }, [messages, loadingMore]);


  // ================= SWITCH CHAT =================
  const handleSelectChat = (chat) => {
    const chatId = chat.chatId;
    if (selectedChat?.chatId === chatId) return;
    setSelectedChat(chat);
    markChatAsRead({chatId})
    setMessages([]);
    setCursor(null);
    setHasMore(true);
    prevScrollHeightRef.current = null;
    isPaginating.current = false;
    fetchMessages(chat);
  };

  // ================= SEND =================
  const handleSendMessage = () => {
    const msg = newMessage.trim();
    if (!msg || !selectedChat) return;
    sendMessageToUser({ receiverId: selectedChat.otherUserId, content: msg });
    setNewMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isMine = (msg) => Number(msg.senderId) === currentUserId;

  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        {chats.map((chat) => (
          <div
            key={chat.chatId}
            className={`chat-item ${
              selectedChat?.chatId === chat.chatId ? "active" : ""
            }`}
            onClick={() => handleSelectChat(chat)}
          
          > 
          <div className="chat-info">
            <div  className="main-info">
            <h4 className="username-text">{chat.otherUserName}</h4>
            <h3 className={chat.unRead === 0 ? "unread-text-disabled" :
                 "unread-text-enabled"
            }>{`(${chat.unRead}) New`}</h3>
          </div>
            <p>{chat.lastMessage}</p>
          </div>
            
          </div>
        ))}
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-main-header">
              <h3>{selectedChat.otherUserName}</h3>
            </div>

            <div
              className="chat-messages"
              onScroll={handleScroll}
              ref={chatRef}
            >
              {loadingMore && (
                <div className="loading-older">Loading older messages...</div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${isMine(msg) ? "sent" : "received"}`}
                >
                  <p>{msg.content}</p>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-div">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="chat-empty">Select a conversation</div>
        )}
      </div>
    </div>
  );
}