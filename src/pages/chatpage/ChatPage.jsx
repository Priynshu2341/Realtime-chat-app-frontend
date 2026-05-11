import { useEffect, useRef, useState, useCallback } from "react";
import { getChats, getMessages } from "../../api/chatAndMsgApi";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router";
import {
  connectWebsocket,
  subscribeToChat,
  subscribeToChatMessages,
  sendMessageToUser,
  subscribeToMessageStatusUpdates,
  subscribeToMessageRefreshUpdate,
  subscribeToMessageSeenUpdate,
  sendOpenChatStatus,
  sendCloseChatStatus,
  connectToOnlineStatus
} from "../../api/websocket";
import { ChatUI } from "./ChatUi";

export function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [userOnlineData,setUserOnlineData] = useState([]);

  const { accessToken, loggedInUserId } = useAuth();
  const navigate = useNavigate();

  const chatRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);
  const seenTimeoutRef = useRef(null);
  const isLoadingRef = useRef(false); 

  const currentUserId = Number(loggedInUserId);
  console.log(chats);
 
  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
      return;
    }
    connectWebsocket(() => setIsConnected(true), accessToken);
    connectToOnlineStatus((msg) => setUserOnlineData(msg)  )
  }, [accessToken, navigate]);

  
  const fetchInitialMessages = useCallback(async (chat) => {
    const res = await getMessages({ chatKey: chat.chatKey });

    setMessages(res.content);
    setCursor(res.nextCursor);
    setHasMore(res.hasMore);

  
  }, []);

 
  useEffect(() => {
    const loadChats = async () => {
      const data = await getChats();
      setChats(data);

      if (data.length > 0) {
        const chat = data[0];
        activeChatRef.current = chat.chatId;

        setSelectedChat(chat);
        sendOpenChatStatus(chat.chatId);
        fetchInitialMessages(chat);
      }
    };

    loadChats();
  }, [fetchInitialMessages]);

  
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor || !selectedChat || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setLoadingMore(true);

    const container = chatRef.current;
    if (!container) {
      isLoadingRef.current = false;
      setLoadingMore(false);
      return;
    }

    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    try {
      const res = await getMessages({
        chatKey: selectedChat.chatKey,
        cursorTime: cursor.createdAt,
        cursorId: cursor.id
      });

      setMessages(prev => [...res.content, ...prev]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);

     
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
        }
      });
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      isLoadingRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, cursor, selectedChat]);

  
  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;

    const handleScroll = () => {
      
      if (container.scrollTop < 100 && !isLoadingRef.current) {
        loadMoreMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [loadMoreMessages]);

 
  useEffect(() => {
    if (!selectedChat || !isConnected) return;

    const sub = subscribeToChatMessages(selectedChat.chatId, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      
      if (activeChatRef.current === selectedChat.chatId) {
        clearTimeout(seenTimeoutRef.current);
        seenTimeoutRef.current = setTimeout(() => {
          sendOpenChatStatus(selectedChat.chatId);
        }, 100);
      }
    });

    return () => sub?.unsubscribe();
  }, [selectedChat, isConnected]);

  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToMessageStatusUpdates((msg) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === msg.messageId
            ? { ...m, messageStatus: msg.messageStatus }
            : m
        )
      );
    });

    return () => sub?.unsubscribe();
  }, [isConnected]);

  
  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToMessageRefreshUpdate((ids) => {
      setMessages(prev =>
        prev.map(m =>
          ids.includes(m.id)
            ? { ...m, messageStatus: "DELIVERED" }
            : m
        )
      );
    });

    return () => sub?.unsubscribe();
  }, [isConnected]);

 
  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToMessageSeenUpdate((ids) => {
      setMessages(prev =>
        prev.map(m =>
          ids.includes(m.id)
            ? { ...m, messageStatus: "READ" }
            : m
        )
      );
    });

    return () => sub?.unsubscribe();
  }, [isConnected]);

  
  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToChat((msg) => {
      setChats(prev => {
        const isOpen = activeChatRef.current === msg.chatId;

        const updated = prev.map(chat => {
          if (chat.chatId !== msg.chatId) return chat;
          

          return {
            ...chat,
            lastMessage: msg.content,
            unread: isOpen ? 0 : (chat.unread || 0) + 1,
          };
        });

        const target = updated.find(c => c.chatId === msg.chatId);
        const rest = updated.filter(c => c.chatId !== msg.chatId);

        return target ? [target, ...rest] : prev;
      });
    });

    return () => sub?.unsubscribe();
  }, [isConnected]);

 
  useEffect(() => {
    return () => {
      clearTimeout(seenTimeoutRef.current);
    };
  }, []);

  
  const handleSelectChat = (chat) => {
    if (selectedChat?.chatId === chat.chatId) return;

    if (activeChatRef.current !== null) {
      sendCloseChatStatus();
    }

    activeChatRef.current = chat.chatId;

    

    setSelectedChat(chat);
    setMessages([]);
    setCursor(null);
    setHasMore(true);
    isLoadingRef.current = false;

   setChats(prev =>
    prev.map(prevChat =>
    prevChat.chatId === chat.chatId
      ? { ...prevChat, unread: 0 }
      : prevChat
  )
);

    sendOpenChatStatus(chat.chatId);
    fetchInitialMessages(chat);
  };


  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;

    sendMessageToUser({
      receiverId: selectedChat.otherUserId,
      content: newMessage.trim(),
    });

    setNewMessage("");
  };

  

  
  return (
    <ChatUI
      chats={chats}
      selectedChat={selectedChat}
      messages={messages}
      newMessage={newMessage}
      currentUserId={currentUserId}
      chatRef={chatRef}
      messagesEndRef={messagesEndRef}
      onSelectChat={handleSelectChat}
      onSendMessage={handleSendMessage}
      onChangeMessage={setNewMessage}
    />
  );
}