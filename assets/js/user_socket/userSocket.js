import { Socket } from "phoenix";

export async function setUserSocket(userToken) {
  const userSocket = new Socket("/user", {
    params: { userToken },
    // binaryType: "arraybuffer",
  });
  userSocket.connect();
  return userSocket;
}
