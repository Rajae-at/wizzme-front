import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import "../assets/styles/Dashboard.css";
import wizzSound from "../assets/sounds/wizz.mp3";
import messageSound from "../assets/sounds/received.mp3";

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWizzing, setIsWizzing] = useState(false);
  const [showWizzNotification, setShowWizzNotification] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const chatWindowRef = useRef(null);
  const wizzSoundRef = useRef(null);
  const messageSoundRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    initializeSocket();
    showWelcomeNotification();

    // Initialiser l'audio avec le chemin importé
    wizzSoundRef.current = new Audio(wizzSound);
    messageSoundRef.current = new Audio(messageSound);
    // Précharger les sons
    wizzSoundRef.current.load();
    messageSoundRef.current.load();
    console.log(
      "Audio initialisé:",
      wizzSoundRef.current,
      messageSoundRef.current
    );

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const showWelcomeNotification = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.pseudo) {
      setTimeout(() => {
        setShowWelcomeMessage(false);
      }, 5000);
    }
  };

  const initializeSocket = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      socketRef.current = io("http://localhost:3000", {
        auth: {
          token: localStorage.getItem("token"),
          email: user.email,
        },
      });

      socketRef.current.on("connect", () => {
        console.log("Connecté au serveur socket");
        // Envoyer l'identité après la connexion
        socketRef.current.emit("set_identity", {
          email: user.email,
          pseudo: user.pseudo,
        });
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("Erreur de connexion socket:", error);
      });

      socketRef.current.on("receive_message", (data) => {
        console.log("Message reçu:", data);
        const newMessage = {
          text: data.message,
          sender: "other",
          timestamp: new Date().toLocaleTimeString(),
          from: data.from,
          pseudo: data.pseudo,
        };
        setMessages((prev) => [...prev, newMessage]);

        // Jouer le son du message reçu
        if (messageSoundRef.current) {
          messageSoundRef.current.currentTime = 0;
          messageSoundRef.current
            .play()
            .then(() => console.log("Son du message reçu joué avec succès"))
            .catch((error) =>
              console.error("Erreur lors de la lecture du son:", error)
            );
        }
      });

      socketRef.current.on("receive_wizz", (data) => {
        console.log("Wizz reçu:", data);
        if (chatWindowRef.current) {
          chatWindowRef.current.classList.add("wizz-animation");
          setTimeout(() => {
            chatWindowRef.current.classList.remove("wizz-animation");
          }, 1500);
        }
      });
    } else {
      console.error("Aucun utilisateur trouvé dans le localStorage");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:3000/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsChatOpen(true);
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedUser && socketRef.current) {
      const message = {
        text: newMessage,
        sender: "me",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, message]);

      // Jouer le son du message envoyé
      if (messageSoundRef.current) {
        messageSoundRef.current.currentTime = 0;
        messageSoundRef.current
          .play()
          .then(() => console.log("Son du message envoyé joué avec succès"))
          .catch((error) =>
            console.error("Erreur lors de la lecture du son:", error)
          );
      }

      console.log("Envoi du message à:", selectedUser.email);
      socketRef.current.emit("send_message", {
        to: selectedUser.email,
        message: newMessage,
      });
      setNewMessage("");
    }
  };

  const handleWizz = () => {
    if (selectedUser && socketRef.current) {
      setIsWizzing(true);
      if (chatWindowRef.current) {
        chatWindowRef.current.classList.add("wizz-animation");
      }

      // Jouer le son wizz
      if (wizzSoundRef.current) {
        console.log("Tentative de lecture du son wizz");
        wizzSoundRef.current.currentTime = 0; // Réinitialiser le son
        wizzSoundRef.current
          .play()
          .then(() => {
            console.log("Son wizz joué avec succès");
          })
          .catch((error) => {
            console.error("Erreur lors de la lecture du son:", error);
          });
      } else {
        console.error("wizzSoundRef.current n'est pas initialisé");
      }

      setShowWizzNotification(true);
      socketRef.current.emit("send_wizz", {
        to: selectedUser.email,
      });

      setTimeout(() => {
        setIsWizzing(false);
        if (chatWindowRef.current) {
          chatWindowRef.current.classList.remove("wizz-animation");
        }
      }, 1500);

      setTimeout(() => {
        setShowWizzNotification(false);
      }, 3000);
    }
  };

  return (
    <div className="dashboard">
      {showWelcomeMessage && (
        <div className="welcome-notification">
          <span className="welcome-icon">👋</span> Bonjour{" "}
          {JSON.parse(localStorage.getItem("user"))?.pseudo} !
        </div>
      )}
      <div className="friends-list">
        <h2>Mes amis</h2>
        <div className="friends-container">
          {users.map((user) => (
            <div
              key={user.email}
              className={`friend-item ${
                selectedUser?.email === user.email ? "active" : ""
              }`}
              onClick={() => handleUserClick(user)}
            >
              <div className="friend-avatar">
                {user.pseudo.charAt(0).toUpperCase()}
              </div>
              <div className="friend-info">
                <span className="friend-name">{user.pseudo}</span>
                <span className="friend-status">En ligne</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isChatOpen && selectedUser && (
        <div className="chat-window" ref={chatWindowRef}>
          <div className="chat-header">
            <h3>{selectedUser.pseudo}</h3>
            <button className="close-chat" onClick={() => setIsChatOpen(false)}>
              ×
            </button>
          </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.sender === "me" ? "sent" : "received"
                }`}
              >
                <div className="message-content">
                  <p>{message.text}</p>
                  <span className="message-time">{message.timestamp}</span>
                </div>
              </div>
            ))}
            {showWizzNotification && (
              <div className="wizz-notification">
                <span className="wizz-icon">⚡</span> Vous avez envoyé un Wizz à{" "}
                {selectedUser.pseudo}!
              </div>
            )}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button className="send-button" onClick={handleSendMessage}>
              Envoyer
            </button>
            <button
              className={`wizz-button ${isWizzing ? "wizzing" : ""}`}
              onClick={handleWizz}
              disabled={isWizzing}
            >
              <span className="wizz-icon">⚡</span> Wizz!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
