import { backendApiSecure } from "../api/axios";

export const getChats = async () => {
  const response = await backendApiSecure.get("/chats/all");
  return response.data;
};

export const getMessages = async ({chatKey,cursorTime,cursorId}) => {
  let url = `/message/find/${chatKey}`;
  if(cursorId && cursorTime){
    url += `?cursorTime=${cursorTime}&cursorId=${cursorId}`;
  }
  const response = await backendApiSecure.get(url);
  return response.data;
};

export const sendMessage = async ({ receiverId, content }) => {
  const response = await backendApiSecure.post("/message/send", {
    receiverId,
    content,
  });
  return response.data;
};

export const markChatAsRead = async ({chatId}) =>{
  console.log(chatId)
  const response = await backendApiSecure.post(`/chats/read/${chatId}`);
  console.log(response.data)
  return response.data;

}

