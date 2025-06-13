export async function setUserSocket(userToken) {
  const { Socket } = await import("phoenix");
  const userSocket = new Socket("/user", {
    params: { userToken },
    // binaryType: "arraybuffer",
  });
  userSocket.connect()
  userSocket.onError(()=> {
    console.error("User socket error")
    throw new Error("User socket error");
  })
  
  return userSocket;
}
