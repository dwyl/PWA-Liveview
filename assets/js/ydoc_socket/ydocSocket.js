import { Socket } from "phoenix";

// the token is a data attribute on the user_token element
const userToken = document.getElementById("user_token").dataset.userToken;

const ydocSocket = new Socket("/ydoc", {
  params: { userToken },
  binaryType: "arraybuffer",
});
ydocSocket.connect();

export default ydocSocket;
