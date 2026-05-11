

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
      console.error("❌ WebSocket Error:", e);
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

  return stompClient.subscribe(
    `/topic/chat/${chatId}`,
    (msg) => {
      cb(JSON.parse(msg.body));
    }
  );
};

export const subscribeToChat = (cb) => {

  if (!isReady()) return;

  return stompClient.subscribe(
    "/user/queue/chats",
    (msg) => {
      cb(JSON.parse(msg.body));
    }
  );
};

export const subscribeToMessageStatusUpdates = (cb) => {

  if (!isReady()) return;

  return stompClient.subscribe(
    "/user/queue/status",
    (msg) => {
      cb(JSON.parse(msg.body));
    }
  );
};

export const subscribeToMessageRefreshUpdate = (cb) => {

  if (!isReady()) return;

  return stompClient.subscribe(
    "/user/queue/refresh",
    (msg) => {
      cb(JSON.parse(msg.body));
    }
  );
};

export const subscribeToMessageSeenUpdate = (cb) => {

  if (!isReady()) return;

  return stompClient.subscribe(
    "/user/queue/seen",
    (msg) => {
      cb(JSON.parse(msg.body));
    }
  );
};

export const subscribeToPresence = (cb) => {

  if (!isReady()) return;

  return stompClient.subscribe(
    "/topic/presence",
    (msg) => {
      cb(JSON.parse(msg.body));
    }
  );
};

export const subscribeToTypingIndicator = (chatId, cb) => {

  if (!isReady()) return;

  return stompClient.subscribe(
    `/topic/chat/${chatId}/typing`,
    (msg) => {
      cb(JSON.parse(msg.body));
    }
  );
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

export const sendCloseChatStatus = (chatId) => {

  if (!isReady()) return;

  stompClient.publish({
    destination: "/app/chat.close",
    body: JSON.stringify({ chatId }),
  });
};

export const sendTypingIndicator = (chatId, typing) => {

  if (!isReady()) return;

  stompClient.publish({
    destination: "/app/chat.typing",

    body: JSON.stringify({
      chatId,
      typing,
    }),
  });
};

export const disconnectWebsocket = async () => {

  if (stompClient) {

    await stompClient.deactivate();

    stompClient = null;

    console.log("❌ WebSocket Disconnected");
  }
};

