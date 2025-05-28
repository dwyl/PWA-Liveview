export async function setUserSocket(userToken) {
  const { Socket } = await import("phoenix");
  const userSocket = new Socket("/user", {
    params: { userToken },
    // binaryType: "arraybuffer",
  });
  userSocket.connect();
  return userSocket;
}
