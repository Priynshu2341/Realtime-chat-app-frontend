import "./pollyfills";
import { Client } from "@stomp/stompjs";

let stompClient = null;

export const connectWebsocket = (onConnected, accessToken) => {
  stompClient = new Client({
    brokerURL: "ws://localhost:8080/ws",
    reconnectDelay: 5000,

    connectHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },

    onConnect: () => {
      console.log("✅ Connected To WebSocket");
      onConnected?.();
    },

    onStompError: (e) => {
      console.error("❌ STOMP Error:", e);
    },

    onWebSocketError: (e) => {
      console.error("❌ WS Error:", e);
    },
  });

  stompClient.activate();
};

const isReady = () => {
  if (!stompClient || !stompClient.connected) {
    console.warn("⚠️ WebSocket not connected");
    return false;
  }
  return true;
};


export const subscribeToChatMessages = (chatId, cb) => {
  if (!isReady()) return;

  return stompClient.subscribe(`/topic/chat/${chatId}`, (msg) => {
    cb(JSON.parse(msg.body));
  });
};

export const subscribeToChat = (cb) => {
  if (!isReady()) return;

  return stompClient.subscribe("/user/queue/chats", (msg) => {
    cb(JSON.parse(msg.body));
  });
};

export const subscribeToMessageStatusUpdates = (cb) => {
  if (!isReady()) return;

  return stompClient.subscribe("/user/queue/status", (msg) => {
    cb(JSON.parse(msg.body));
  });
};

export const subscribeToMessageRefreshUpdate = (cb) => {
  if (!isReady()) return;

  return stompClient.subscribe("/user/queue/refresh", (msg) => {
    cb(JSON.parse(msg.body));
  });
};

export const subscribeToMessageSeenUpdate = (cb) => {
  if (!isReady()) return;

  return stompClient.subscribe("/user/queue/seen", (msg) => {
    cb(JSON.parse(msg.body));
  });
};


export const sendMessageToUser = (data) => {
  if (!isReady()) return;

  stompClient.publish({
    destination: "/app/chat.send",
    body: JSON.stringify(data),
  });
};

export const sendOpenChatStatus = (chatId) => {
  if (!isReady()) return;

  stompClient.publish({
    destination: "/app/chat.open",
    body: JSON.stringify({ chatId }),
  });
};

export const sendCloseChatStatus = () => {
  if (!isReady()) return;

  stompClient.publish({
    destination: "/app/chat.close",
    body: "", 
  });
};


export const connectToOnlineStatus = (onPresenceUpdate) => {
  if (!isReady()) return;

  stompClient.subscribe("/app/topic/presence",(msg) => {
      const body = JSON.parse(msg.body);
      onPresenceUpdate(body);
  })
}


export const disconnectWebsocket = () => {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
};