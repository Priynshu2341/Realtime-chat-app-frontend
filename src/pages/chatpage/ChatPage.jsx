import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getChats, getMessages, markChatAsRead } from "../../api/chatAndMsgApi";
import "../../styles/chat-page.css";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router";
import {Check,CheckCheck} from "lucide-react";
import {
  connectWebsocket,
  subscribeToChat,
  subscribeToChatMessages,
  sendMessageToUser,
  subscribeToMessageStatusUpdates,
  subscribeToMessageRefreshUpdate
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
  console.log(messages);


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

    prevScrollHeightRef.current = container.scrollHeight;

    try {
      const res = await getMessages({
        chatKey: selectedChat.chatKey,
        cursorTime: cursor.createdAt,
        cursorId: cursor.id,
      });

      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const newMsgs = res.content.filter((m) => !existing.has(m.id));
        if (newMsgs.length === 0) return prev;
        return [...newMsgs, ...prev];
      });

      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };


  useLayoutEffect(() => {
    const container = chatRef.current;
    if (!container || prevScrollHeightRef.current === null) return;

    container.scrollTop =
      container.scrollHeight - prevScrollHeightRef.current;

    prevScrollHeightRef.current = null;
    isPaginating.current = false;
  }, [messages]);


  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
      return;
    }
    connectWebsocket(() => setIsConnected(true), accessToken);
  }, [accessToken, navigate]);

  
  useEffect(() => { 
    const loadChats = async () => {
      const data = await getChats();
      setChats(data);

      if (data.length > 0) {
        setSelectedChat(data[0]);
        fetchMessages(data[0]);
      }
    };

    loadChats();
    if(!isConnected) return;

   const sub = subscribeToMessageRefreshUpdate((msg) => {
    
      setMessages(prev => {
        prev.map(m => {
          msg.includes(m.id) ? {
            ...m,
            messageStatus: "SEEN"
          } : m
        })
        
      })
    })

    return(() => sub?.unsubscribe() )
  }, [isConnected,messages]);

  
  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToChat((msg) => {
      setChats((prev) => {
        const updated = prev.map((chat) => {
          if (chat.chatId !== msg.chatId) return chat;

          const isOpen =
            selectedChat && msg.chatId === selectedChat.chatId;

          return {
            ...chat,
            lastMessage: msg.content,
            createdAt: msg.createdAt,
            unread: isOpen ? 0 : (chat.unread || 0) + 1,
          };
        });

        const target = updated.find((c) => c.chatId === msg.chatId);
        const rest = updated.filter((c) => c.chatId !== msg.chatId);

        if (!target) return prev;

        return [target, ...rest];
      });
    });

    return () => sub?.unsubscribe();
  }, [isConnected, selectedChat]);

  
  useEffect(() => {
    if (!selectedChat || !isConnected) return;

    const sub = subscribeToChatMessages(
      selectedChat.chatId,
      (msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        markChatAsRead({ chatId: selectedChat.chatId });
      }
    );

    return () => sub?.unsubscribe();
  }, [selectedChat, isConnected]);


  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;

    if (isPaginating.current || prevScrollHeightRef.current !== null)
      return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 80;

    if (isNearBottom) {
      isProgrammaticScroll.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 150);
    }
  }, [messages]);

 
  useEffect(() => {
    if (!isConnected) return; 

    const sub = subscribeToMessageStatusUpdates((msg) => {
      setMessages((prev) =>
        prev.map((message) => {  // ✅ FIX 2: return the mapped array
          if (message.id === msg.messageId) {
            return {
              ...message,
              messageStatus: msg.messageStatus,
            };
          }
          return message;
        })
      );
    });

    return () => sub?.unsubscribe();
  }, [isConnected]);



  
  const handleSelectChat = (chat) => {
    if (selectedChat?.chatId === chat.chatId) return;

    setSelectedChat(chat);

    markChatAsRead({ chatId: chat.chatId });

    setChats((prev) =>
      prev.map((c) =>
        c.chatId === chat.chatId ? { ...c, unread: 0 } : c
      )
    );

    setMessages([]);
    setCursor(null);
    setHasMore(true);
    fetchMessages(chat);
  };

 
  const handleSendMessage = () => {
    const msg = newMessage.trim();
    if (!msg || !selectedChat) return;

    sendMessageToUser({
      receiverId: selectedChat.otherUserId,
      content: msg,
    });

    setNewMessage("");
  };


  const handleMessageStatus = (msg) => {
      if(msg.messageStatus === "SENT") {
        return <Check size={16} />
      }
       if(msg.messageStatus === "DELIVERED") {
        return <CheckCheck size={16}  />
      }
       if(msg.messageStatus === "SEEN") {
        return <CheckCheck size={16} color="yellow" />
      }
  }
  
  const isMine = (msg) =>
    Number(msg.senderId) === currentUserId;

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
              <div className="main-info">
                <h4>{chat.otherUserName}</h4>
                {chat.unread > 0 && (
                  <span className="badge">{chat.unread}</span>
                )}
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
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message  ${
                    isMine(msg) ? "sent" : "received"
                  }`}
                >
                  <div className="message-content">
                    <span className="content-text" >{msg.content}</span>
                    {isMine(msg) && handleMessageStatus(msg)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-div">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div>Select chat</div>
        )}
      </div>
    </div>
  );
}
