import { backendApiSecure } from "../api/axios";

const handleError = (error, defaultMessage) => {
  console.error("API Error:", error);

  if (error.response) {
    return {
      success: false,
      message: error.response.data?.message || defaultMessage,
      status: error.response.status
    };
  }

  return {
    success: false,
    message: defaultMessage || "Something went wrong"
  };
};

export const getChats = async () => {
  try {
    const res = await backendApiSecure.get("/chats/all");
    return res.data;
  } catch (error) {
    return handleError(error, "Failed to fetch chats");
  }
};

export const getMessages = async ({ chatKey, cursorTime, cursorId }) => {
  try {
    let url = `/message/find/${chatKey}`;

    if (cursorTime && cursorId) {
      url += `?cursorTime=${cursorTime}&cursorId=${cursorId}`;
    }

    const res = await backendApiSecure.get(url);
    return res.data;
  } catch (error) {
    return handleError(error, "Failed to fetch messages");
  }
};

export const sendMessage = async ({ receiverId, content }) => {
  try {
    const res = await backendApiSecure.post("/message/send", {
      receiverId,
      content
    });

    return res.data;
  } catch (error) {
    return handleError(error, "Failed to send message");
  }
};

export const markChatAsRead = async ({ chatId }) => {
  try {
    const res = await backendApiSecure.post(`/chats/read/${chatId}`);
    return res.data;
  } catch (error) {
    return handleError(error, "Failed to mark chat as read");
  }
};

export const markChatAsSeen = async ({ chatId }) => {
  try {
    const res = await backendApiSecure.post(`/message/mark/seen/${chatId}`);
    return res.data;
  } catch (error) {
    return handleError(error, "Failed to mark chat as seen");
  }
};

export const sendImages = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await backendApiSecure.post("/uploads/file", formData);
    return res.data;
  } catch (error) {
    return handleError(error, "Failed to upload image");
  }
};

export const searchUserByEmail = async (email) => {
  try {
    const res = await backendApiSecure.get("/users/find", {
      params: {
        email: email
      }
    });

    return res.data;
  } catch (e) {
    return handleError(e, "Failed to find User");
  }
};

export const searchAlluser = async () => {
  try {
    const res = await backendApiSecure.get("/users/find/all");
    return res.data;
  } catch (e) {
    return handleError(e, "Failed to find User");
  }
};
