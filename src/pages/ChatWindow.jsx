import React, { useState } from "react";

export default function ChatWindow({ user, socket, from }) {
  const [message, setMessage] = useState("");

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("send_message", { to: user.email, message });
      setMessage("");
    }
  };

  return (
    <div>
      <h3>Chat with {user.pseudo}</h3>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
