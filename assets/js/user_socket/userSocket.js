import { Socket } from "phoenix";

export async function setUserSocket() {
  const response = await fetch("/api/user_token");
  const { user_token } = await response.json();

  const userSocket = new Socket("/user", {
    params: { userToken: user_token },
    binaryType: "arraybuffer",
  });
  userSocket.connect();
  return userSocket;
}
