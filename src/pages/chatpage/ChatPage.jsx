import { useEffect, useRef, useState, useCallback } from "react";

import { getChats, getMessages, sendImages } from "../../api/chatAndMsgApi";

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

  const [selectedImage, setSelectedImage] = useState(null);

  const [previewUrl, setPreviewUrl] = useState(null);

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

  // IMAGE SELECT
  console.log(selectedChat);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setSelectedImage(file);

    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);

    setPreviewUrl(null);
  };

  // WEBSOCKET CONNECT

  useEffect(() => {
    if (!accessToken) {
      navigate("/login");

      return;
    }

    connectWebsocket(() => setIsConnected(true), accessToken);

    return () => {
      disconnectWebsocket();
    };
  }, [accessToken, navigate]);

  // FETCH INITIAL MESSAGES

  const fetchInitialMessages = useCallback(async (chat) => {
    const res = await getMessages({
      chatKey: chat.chatKey
    });

    setMessages(res.content);

    setCursor(res.nextCursor);

    setHasMore(res.hasMore);
  }, []);

  // LOAD CHATS

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

  // PRESENCE

  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToPresence((presence) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.otherUserName === presence.email) {
            return {
              ...chat,
              isOtherUserOnline:
                presence.onlineStatus === "ONLINE" ? true : false
            };
          }

          return chat;
        })
      );

      setSelectedChat((prev) => {
        if (!prev) return prev;

        if (prev.otherUserName === presence.email) {
          return {
            ...prev,
            isOtherUserOnline: presence.onlineStatus === "ONLINE" ? true : false
          };
        }

        return prev;
      });
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [isConnected]);

  // CHAT MESSAGES

  useEffect(() => {
    if (!selectedChat || !isConnected) return;

    const sub = subscribeToChatMessages(selectedChat.chatId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }

        return [...prev, msg];
      });

      clearTimeout(seenTimeoutRef.current);

      seenTimeoutRef.current = setTimeout(() => {
        sendOpenChatStatus(selectedChat.chatId);
      }, 100);
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [selectedChat, isConnected]);

  // MESSAGE STATUS

  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToMessageStatusUpdates((msg) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.messageId
            ? {
                ...m,
                messageStatus: msg.messageStatus
              }
            : m
        )
      );
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [isConnected]);

  // DELIVERED

  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToMessageRefreshUpdate((ids) => {
      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id)
            ? {
                ...m,
                messageStatus: "DELIVERED"
              }
            : m
        )
      );
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [isConnected]);

  // SEEN

  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToMessageSeenUpdate((ids) => {
      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id)
            ? {
                ...m,
                messageStatus: "READ"
              }
            : m
        )
      );
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [isConnected]);

  // CHAT LIST UPDATES

  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribeToChat((msg) => {
      setChats((prev) => {
        const isOpen = activeChatRef.current === msg.chatId;

        const updated = prev.map((chat) => {
          if (chat.chatId !== msg.chatId) {
            return chat;
          }

          return {
            ...chat,
            lastMessage: msg.content || "📷 Image",

            unread: isOpen ? 0 : (chat.unread || 0) + 1
          };
        });

        const target = updated.find((c) => c.chatId === msg.chatId);

        const rest = updated.filter((c) => c.chatId !== msg.chatId);

        return target ? [target, ...rest] : prev;
      });
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [isConnected]);

  // TYPING

  useEffect(() => {
    if (!selectedChat || !isConnected) return;

    const sub = subscribeToTypingIndicator(selectedChat.chatId, (data) => {
      if (Number(data.senderId) === Number(currentUserId)) {
        return;
      }

      setIsTyping(data.typing);
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [selectedChat, isConnected, currentUserId]);

  // AUTO SCROLL

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, isTyping]);

  // CLEANUP

  useEffect(() => {
    return () => {
      clearTimeout(seenTimeoutRef.current);

      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // PAGINATION

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

      setMessages((prev) => [...res.content, ...prev]);

      setCursor(res.nextCursor);

      setHasMore(res.hasMore);

      requestAnimationFrame(() => {
        const newHeight = container.scrollHeight;

        container.scrollTop = prevTop + (newHeight - prevHeight);
      });
    } finally {
      isLoadingRef.current = false;

      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, cursor, selectedChat]);

  // SCROLL LISTENER

  useEffect(() => {
    const container = chatRef.current;

    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 100 && !isLoadingRef.current) {
        loadMoreMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [loadMoreMessages]);

  // SELECT CHAT

  const handleSelectChat = async (chat) => {
    /* MOBILE BACK */

    if (!chat) {
      if (activeChatRef.current !== null) {
        sendCloseChatStatus(activeChatRef.current);
      }

      activeChatRef.current = null;

      setSelectedChat(null);

      setMessages([]);

      setCursor(null);

      setHasMore(true);

      setIsTyping(false);

      return;
    }

    /* SAME CHAT */

    if (selectedChat?.chatId === chat.chatId) {
      return;
    }

    /* CLOSE OLD CHAT */

    if (activeChatRef.current !== null) {
      sendCloseChatStatus(activeChatRef.current);
    }

    /* OPEN NEW CHAT */

    activeChatRef.current = chat.chatId;

    setSelectedChat(chat);

    setMessages([]);

    setCursor(null);

    setHasMore(true);

    setIsTyping(false);

    isLoadingRef.current = false;

    /* RESET UNREAD */

    setChats((prev) =>
      prev.map((c) =>
        c.chatId === chat.chatId
          ? {
              ...c,
              unread: 0
            }
          : c
      )
    );

    sendOpenChatStatus(chat.chatId);

    await fetchInitialMessages(chat);
  };

  // SEND MESSAGE

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) {
      return;
    }

    try {
      let mediaUrl = null;

      // UPLOAD IMAGE

      if (selectedImage) {
        const uploadRes = await sendImages(selectedImage);

        mediaUrl = uploadRes.mediaUrl;
      }

      // SEND MESSAGE

      sendMessageToUser({
        receiverId: selectedChat.otherUserId,

        content: newMessage.trim(),

        mediaUrl,

        messageType: mediaUrl ? "IMAGE" : "TEXT"
      });

      // RESET

      setNewMessage("");

      clearSelectedImage();

      isTypingRef.current = false;

      sendTypingIndicator(selectedChat.chatId, false);
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  // MESSAGE INPUT

  const handleMessageChange = (value) => {
    setNewMessage(value);

    if (!selectedChat) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;

      sendTypingIndicator(selectedChat.chatId, true);
    }

    clearTimeout(typingTimeoutRef.current);

    const currentChatId = selectedChat.chatId;

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;

      sendTypingIndicator(currentChatId, false);
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
      selectedImage={selectedImage}
      previewUrl={previewUrl}
      onImageSelect={handleImageSelect}
      clearSelectedImage={clearSelectedImage}
    />
  );
}
