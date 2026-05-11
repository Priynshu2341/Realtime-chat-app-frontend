
import {
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";

import {
  getChats,
  getMessages
} from "../../api/chatAndMsgApi";

import { useAuth } from "../../auth/AuthContext";

import { useNavigate } from "react-router";

import {
  connectWebsocket,
  disconnectWebsocket,
  subscribeToChat,
  subscribeToChatMessages,
  sendMessageToUser,
  subscribeToMessageStatusUpdates,
  subscribeToMessageRefreshUpdate,
  subscribeToMessageSeenUpdate,
  sendOpenChatStatus,
  sendCloseChatStatus,
  subscribeToPresence,
  sendTypingIndicator,
  subscribeToTypingIndicator
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

  const [isTyping, setIsTyping] = useState(false);

  const { accessToken, loggedInUserId } = useAuth();

  const currentUserId = Number(loggedInUserId);

  const navigate = useNavigate();

  const chatRef = useRef(null);

  const messagesEndRef = useRef(null);

  const activeChatRef = useRef(null);

  const seenTimeoutRef = useRef(null);

  const isLoadingRef = useRef(false);

  const typingTimeoutRef = useRef(null);

  const isTypingRef = useRef(false);

  useEffect(() => {

    if (!accessToken) {
      navigate("/login");
      return;
    }

    connectWebsocket(
      () => setIsConnected(true),
      accessToken
    );

    return () => {
      disconnectWebsocket();
    };

  }, [accessToken, navigate]);

  const fetchInitialMessages = useCallback(async (chat) => {

    const res = await getMessages({
      chatKey: chat.chatKey
    });

    setMessages(res.content);

    setCursor(res.nextCursor);

    setHasMore(res.hasMore);

  }, []);

  useEffect(() => {

    const loadChats = async () => {

      const data = await getChats();

      setChats(data);

      if (data.length > 0) {

        const firstChat = data[0];

        activeChatRef.current = firstChat.chatId;

        setSelectedChat(firstChat);

        sendOpenChatStatus(firstChat.chatId);

        fetchInitialMessages(firstChat);
      }
    };

    loadChats();

  }, [fetchInitialMessages]);

  useEffect(() => {

    if (!isConnected) return;

    const sub = subscribeToPresence((presence) => {

      setChats(prev =>
        prev.map(chat => {

          if (
            Number(chat.otherUserId) ===
            Number(presence.userId)
          ) {

            return {
              ...chat,
              isOtherUserOnline:
                presence.onlineStatus === "ONLINE"
            };
          }

          return chat;
        })
      );

      setSelectedChat(prev => {

        if (!prev) return prev;

        if (
          Number(prev.otherUserId) ===
          Number(presence.userId)
        ) {

          return {
            ...prev,
            isOtherUserOnline:
              presence.onlineStatus === "ONLINE"
          };
        }

        return prev;
      });
    });

    return () => {
      sub?.unsubscribe();
    };

  }, [isConnected]);

  useEffect(() => {

    if (!selectedChat || !isConnected) return;

    const sub = subscribeToChatMessages(
      selectedChat.chatId,
      (msg) => {

        setMessages(prev => {

          if (prev.some(m => m.id === msg.id)) {
            return prev;
          }

          return [...prev, msg];
        });

        clearTimeout(seenTimeoutRef.current);

        seenTimeoutRef.current = setTimeout(() => {

          sendOpenChatStatus(selectedChat.chatId);

        }, 100);
      }
    );

    return () => {
      sub?.unsubscribe();
    };

  }, [selectedChat, isConnected]);

  useEffect(() => {

    if (!isConnected) return;

    const sub = subscribeToMessageStatusUpdates(
      (msg) => {

        setMessages(prev =>
          prev.map(m =>
            m.id === msg.messageId
              ? {
                  ...m,
                  messageStatus: msg.messageStatus
                }
              : m
          )
        );
      }
    );

    return () => {
      sub?.unsubscribe();
    };

  }, [isConnected]);

  useEffect(() => {

    if (!isConnected) return;

    const sub = subscribeToMessageRefreshUpdate(
      (ids) => {

        setMessages(prev =>
          prev.map(m =>
            ids.includes(m.id)
              ? {
                  ...m,
                  messageStatus: "DELIVERED"
                }
              : m
          )
        );
      }
    );

    return () => {
      sub?.unsubscribe();
    };

  }, [isConnected]);

  useEffect(() => {

    if (!isConnected) return;

    const sub = subscribeToMessageSeenUpdate(
      (ids) => {

        setMessages(prev =>
          prev.map(m =>
            ids.includes(m.id)
              ? {
                  ...m,
                  messageStatus: "READ"
                }
              : m
          )
        );
      }
    );

    return () => {
      sub?.unsubscribe();
    };

  }, [isConnected]);

  useEffect(() => {

    if (!isConnected) return;

    const sub = subscribeToChat((msg) => {

      setChats(prev => {

        const isOpen =
          activeChatRef.current === msg.chatId;

        const updated = prev.map(chat => {

          if (chat.chatId !== msg.chatId) {
            return chat;
          }

          return {
            ...chat,
            lastMessage: msg.content,
            unread: isOpen
              ? 0
              : (chat.unread || 0) + 1
          };
        });

        const target = updated.find(
          c => c.chatId === msg.chatId
        );

        const rest = updated.filter(
          c => c.chatId !== msg.chatId
        );

        return target
          ? [target, ...rest]
          : prev;
      });
    });

    return () => {
      sub?.unsubscribe();
    };

  }, [isConnected]);

  useEffect(() => {

    if (!selectedChat || !isConnected) return;

    const currentChatId = selectedChat.chatId;

    const sub = subscribeToTypingIndicator(
      currentChatId,
      (data) => {

        if (
          Number(data.senderId) ===
          Number(currentUserId)
        ) {
          return;
        }

        setIsTyping(data.typing);
      }
    );

    return () => {
      sub?.unsubscribe();
    };

  }, [
    selectedChat,
    isConnected,
    currentUserId
  ]);

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });

  }, [messages, isTyping]);

  useEffect(() => {

    return () => {

      clearTimeout(seenTimeoutRef.current);

      clearTimeout(typingTimeoutRef.current);
    };

  }, []);

  const loadMoreMessages = useCallback(async () => {

    if (
      !hasMore ||
      loadingMore ||
      !cursor ||
      !selectedChat ||
      isLoadingRef.current
    ) {
      return;
    }

    isLoadingRef.current = true;

    setLoadingMore(true);

    const container = chatRef.current;

    if (!container) {

      isLoadingRef.current = false;

      setLoadingMore(false);

      return;
    }

    const prevHeight = container.scrollHeight;

    const prevTop = container.scrollTop;

    try {

      const res = await getMessages({
        chatKey: selectedChat.chatKey,
        cursorTime: cursor.createdAt,
        cursorId: cursor.id
      });

      setMessages(prev => [
        ...res.content,
        ...prev
      ]);

      setCursor(res.nextCursor);

      setHasMore(res.hasMore);

      requestAnimationFrame(() => {

        const newHeight =
          container.scrollHeight;

        container.scrollTop =
          prevTop + (newHeight - prevHeight);
      });

    } finally {

      isLoadingRef.current = false;

      setLoadingMore(false);
    }

  }, [
    hasMore,
    loadingMore,
    cursor,
    selectedChat
  ]);

  useEffect(() => {

    const container = chatRef.current;

    if (!container) return;

    const handleScroll = () => {

      if (
        container.scrollTop < 100 &&
        !isLoadingRef.current
      ) {
        loadMoreMessages();
      }
    };

    container.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {

      container.removeEventListener(
        "scroll",
        handleScroll
      );
    };

  }, [loadMoreMessages]);

  const handleSelectChat = (chat) => {

    if (
      selectedChat?.chatId === chat.chatId
    ) {
      return;
    }

    if (activeChatRef.current !== null) {

      sendCloseChatStatus(
        activeChatRef.current
      );
    }

    activeChatRef.current = chat.chatId;

    setSelectedChat(chat);

    setMessages([]);

    setCursor(null);

    setHasMore(true);

    isLoadingRef.current = false;

    setChats(prev =>
      prev.map(c =>
        c.chatId === chat.chatId
          ? { ...c, unread: 0 }
          : c
      )
    );

    sendOpenChatStatus(chat.chatId);

    fetchInitialMessages(chat);
  };

  const handleSendMessage = () => {

    if (
      !newMessage.trim() ||
      !selectedChat
    ) {
      return;
    }

    sendMessageToUser({
      receiverId: selectedChat.otherUserId,
      content: newMessage.trim(),
    });

    setNewMessage("");

    isTypingRef.current = false;

    sendTypingIndicator(
      selectedChat.chatId,
      false
    );
  };

  const handleMessageChange = (value) => {

    setNewMessage(value);

    if (!selectedChat) return;

    if (!isTypingRef.current) {

      isTypingRef.current = true;

      sendTypingIndicator(
        selectedChat.chatId,
        true
      );
    }

    clearTimeout(
      typingTimeoutRef.current
    );

    const currentChatId =
      selectedChat.chatId;

    typingTimeoutRef.current =
      setTimeout(() => {

        isTypingRef.current = false;

        sendTypingIndicator(
          currentChatId,
          false
        );

      }, 1500);
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
      onChangeMessage={handleMessageChange}
      isTyping={isTyping}
    />
  );
}

