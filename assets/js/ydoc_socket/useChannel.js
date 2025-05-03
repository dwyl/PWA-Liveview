export function useChannel(socket, topic, params) {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket not found"));
      return;
    }

    const channel = socket.channel(topic, params);
    channel
      .join()
      .receive("ok", () => {
        console.log(`Joined successfully Channel : ${topic}`);
        resolve(channel);
      })

      .receive("error", (resp) => {
        console.log(`Unable to join ${topic}`, resp.reason);
        reject(new Error(resp.reason));
      });
    channel.onClose(() => console.log(`Channel closed: ${topic}`));
  });
}
