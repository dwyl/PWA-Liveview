// export function usersTokenChannel(userSocket, { _user_token, user_id }) {
//   const channel = userSocket.channel(`users_token:${user_id}`, {});

//   channel
//     .join()
//     .receive("ok", () => console.log(`Joined users_token:${userId} channel`))
//     .receive("error", (resp) =>
//       console.error("Failed to join users_token channel", resp)
//     );

//   channel.on("disconnect", (payload) => {
//     console.warn("[users_token] disconnect event:", payload);
//     window.location.href = "/";
//   });

//   channel.on("access-renewed", (_payload) => {});
// }
