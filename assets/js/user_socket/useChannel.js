/**
 * Creates and joins a Phoenix channel with promise-based error handling.
 * Establishes a bidirectional communication channel on the provided socket.
 * Returns a promise that resolves with the joined channel or rejects on failure.
 *
 * @function useChannel
 * @param {Socket} socket - The Phoenix Socket instance to create the channel on
 * @param {string} topic - The channel topic/name to join (e.g., "room:lobby", "user:123")
 * @param {Object} [params={}] - Optional parameters to send when joining the channel
 * @returns {Promise<Channel>} Promise that resolves with the joined Phoenix Channel instance
 * @throws {Error} When socket is not provided or channel join fails
 *
 * @description
 * This function handles the complete channel lifecycle setup:
 * 1. Validates that a socket instance is provided
 * 2. Creates a new channel with the specified topic and parameters
 * 3. Attempts to join the channel
 * 4. Sets up success/error handlers for the join operation
 * 5. Configures close event logging
 * 6. Returns the channel instance once successfully joined
 *
 * The function uses Phoenix's built-in channel join mechanism
 * with promise wrapper for better async/await compatibility.
 *
 * @example
 * // Join a room channel
 * const socket = await setUserSocket('user-token');
 * const channel = await useChannel(socket, 'room:lobby', { user_id: 123 });
 * channel.push('new_message', { body: 'Hello world!' });
 */
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
