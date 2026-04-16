import { backendApiSecure } from "../api/axios";

export const getChats = async () => {
  const response = await backendApiSecure.get("/chats/all");
  return response.data;
};

export const getMessages = async ({ chatKey }) => {
  const response = await backendApiSecure.get(`/message/find/${chatKey}`);
  return response.data;
};

export const sendMessage = async ({ receiverId, content }) => {
  const response = await backendApiSecure.post("/message/send", {
    receiverId,
    content,
  });
  return response.data;
};

