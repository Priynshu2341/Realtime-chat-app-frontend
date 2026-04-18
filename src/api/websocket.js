import "./pollyfills"
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";




let stompClient = null;


export const connectWebsocket = (onConnected,accessToken) => {


  stompClient = new Client({
    brokerURL: "ws://localhost:8080/ws",
    reconnectDelay: 5000,

    connectHeaders: {
      Authorization: `Bearer ${accessToken}`
    },

    onConnect: () => {
      console.log("✅ Connected To WebSocket");
      if (onConnected) onConnected(); 
    },

    onStompError: (e) => {
      console.error("❌ STOMP Error:", e);
    },

    onWebSocketError: (e) => {
      console.error("❌ WS Error:", e);
    }
  });

  stompClient.activate();
};

export const subscribeToChatMessages = (chatId, onMessageReceived) => {
  if (!stompClient || !stompClient.connected) {
    console.warn("⚠️ Tried to subscribe before connection");
    return;
  }

  return stompClient.subscribe(`/topic/chat/${chatId}`, (message) => {
    const body = JSON.parse(message.body);
    onMessageReceived(body);
  });
};

export const subscribeToChat = (onMessageReceived) => {

   if (!stompClient || !stompClient.connected) {
    console.warn("⚠️ Tried to subscribe before connection");
    return;
  }
  


  return stompClient.subscribe("/user/queue/chats",(message) => {
    const body = JSON.parse(message.body);
    console.log(body);
    onMessageReceived(body);
  });
}

export const sendMessageToUser = (data) => {
  if (!stompClient || !stompClient.connected) {
    console.error("❌ Not Connected");
    return;
  }

  stompClient.publish({
    destination: "/app/chat.send",
    body: JSON.stringify(data),
  });
};

export const disconnectWebsocket = () => {
  if (stompClient) {
    stompClient.deactivate();
  }
};