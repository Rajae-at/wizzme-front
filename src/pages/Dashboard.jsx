import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import io from "socket.io-client";
import "../assets/styles/Dashboard.css";
import wizzSound from "../assets/sounds/wizz.mp3";
import messageSound from "../assets/sounds/received.mp3";

// Constantes
const SOCKET_URL = "http://localhost:3000";
const API_URL = "http://localhost:3000";
const WELCOME_TIMEOUT = 5000;
const WIZZ_ANIMATION_DURATION = 1500;
const WIZZ_NOTIFICATION_DURATION = 3000;

// Composant pour l'avatar d'un utilisateur
const UserAvatar = React.memo(({ pseudo }) => (
  <div className="friend-avatar">{pseudo.charAt(0).toUpperCase()}</div>
));

// Composant pour l'élément d'ami
const FriendItem = React.memo(({ user, isSelected, isOnline, onClick }) => (
  <div
    className={`friend-item ${isSelected ? "active" : ""}`}
    onClick={onClick}
  >
    <UserAvatar pseudo={user.pseudo} />
    <div className="friend-info">
      <span className="friend-name">{user.pseudo}</span>
      <span className={`friend-status ${isOnline ? "online" : "offline"}`}>
        {isOnline ? "En ligne" : "Hors ligne"}
      </span>
    </div>
  </div>
));

// Composant pour le message
const Message = React.memo(({ message }) => {
  // Fonction pour formater la date
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp); // Essaye de créer une date depuis le timestamp (ISO ou autre)
      if (isNaN(date.getTime())) {
        // Vérifie si la date est valide
        // Si invalide, tente de voir si c'est déjà une heure (ex: "10:30:00")
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(timestamp)) {
          return timestamp; // Retourne directement si c'est déjà formaté
        }
        return "Date invalide";
      }
      // Si la date est valide, retourne l'heure locale
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Erreur formatage timestamp:", timestamp, error);
      return "Erreur date";
    }
  };

  return (
    <div className={`message ${message.sender === "me" ? "sent" : "received"}`}>
      <div className="message-content">
        <p>{message.text}</p>
        {/* Utilise la fonction de formatage ici */}
        <span className="message-time">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  );
});

const Dashboard = () => {
  // États
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWizzing, setIsWizzing] = useState(false);
  const [showWizzNotification, setShowWizzNotification] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Références
  const chatWindowRef = useRef(null);
  const wizzSoundRef = useRef(null);
  const messageSoundRef = useRef(null);
  const socketRef = useRef(null);
  const userRef = useRef(JSON.parse(localStorage.getItem("user")));

  // Initialisation des sons
  useEffect(() => {
    wizzSoundRef.current = new Audio(new URL(wizzSound, import.meta.url).href);
    messageSoundRef.current = new Audio(
      new URL(messageSound, import.meta.url).href
    );

    // Précharger les sons
    wizzSoundRef.current.load();
    messageSoundRef.current.load();

    return () => {
      // Nettoyage des ressources audio
      if (wizzSoundRef.current) {
        wizzSoundRef.current.pause();
        wizzSoundRef.current = null;
      }
      if (messageSoundRef.current) {
        messageSoundRef.current.pause();
        messageSoundRef.current = null;
      }
    };
  }, []);

  // Initialisation du socket et récupération des utilisateurs
  useEffect(() => {
    fetchUsers();
    initializeSocket();
    showWelcomeNotification();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Fonction pour jouer un son
  const playSound = useCallback((soundRef, soundName) => {
    if (soundRef.current) {
      soundRef.current.currentTime = 0;
      soundRef.current
        .play()
        .then(() => console.log(`Son ${soundName} joué avec succès`))
        .catch((error) =>
          console.error(`Erreur lors de la lecture du son ${soundName}:`, error)
        );
    }
  }, []);

  // Fonction pour afficher la notification de bienvenue
  const showWelcomeNotification = useCallback(() => {
    if (userRef.current?.pseudo) {
      setTimeout(() => {
        setShowWelcomeMessage(false);
      }, WELCOME_TIMEOUT);
    }
  }, []);

  // Initialisation du socket
  const initializeSocket = useCallback(() => {
    if (!userRef.current) {
      console.error("Aucun utilisateur trouvé dans le localStorage");
      return;
    }

    const token = localStorage.getItem("token");
    console.log("Initialisation du socket avec:", {
      token: token ? "Présent" : "Absent",
      user: userRef.current,
    });

    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: token,
        email: userRef.current.email,
        pseudo: userRef.current.pseudo,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Gestion de la connexion
    socketRef.current.on("connect", () => {
      console.log("Socket connecté avec succès:", {
        socketId: socketRef.current.id,
        user: userRef.current,
      });

      // Envoyer l'identité après la connexion
      socketRef.current.emit("set_identity", {
        email: userRef.current.email,
        pseudo: userRef.current.pseudo,
      });
      console.log("Identité envoyée au serveur");
    });

    // Gestion des erreurs de connexion
    socketRef.current.on("connect_error", (error) => {
      console.error("Erreur de connexion socket:", error);
    });

    // Gestion des changements de statut
    socketRef.current.on("user_status_change", (data) => {
      console.log("Changement de statut reçu:", data);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (data.status === "online") {
          newSet.add(data.email);
        } else {
          newSet.delete(data.email);
        }
        console.log("Nouveau set d'utilisateurs en ligne:", Array.from(newSet));
        return newSet;
      });
    });

    // Récupération de la liste initiale des utilisateurs en ligne
    socketRef.current.on("initial_online_users", (data) => {
      console.log("Liste initiale des utilisateurs en ligne reçue:", data);
      setOnlineUsers(new Set(data));
    });

    // Réception des messages
    socketRef.current.on("receive_message", (data) => {
      console.log("Message reçu du serveur:", data);
      const newMessage = {
        text: data.message,
        sender: "other",
        timestamp: data.timestamp,
        from: data.from,
        pseudo: data.pseudo,
      };
      console.log("Nouveau message formaté:", newMessage);
      setMessages((prev) => [...prev, newMessage]);
      playSound(messageSoundRef, "message reçu");
    });

    // Réception des wizz
    socketRef.current.on("receive_wizz", (data) => {
      console.log("Wizz reçu du serveur:", data);
      if (chatWindowRef.current) {
        chatWindowRef.current.classList.add("wizz-animation");
        setTimeout(() => {
          chatWindowRef.current.classList.remove("wizz-animation");
        }, WIZZ_ANIMATION_DURATION);
      }
      playSound(wizzSoundRef, "wizz reçu");
    });

    // Gestion des erreurs
    socketRef.current.on("error", (error) => {
      console.error("Erreur socket reçue:", error);
    });

    // Gestion de la déconnexion
    socketRef.current.on("disconnect", (reason) => {
      console.log("Socket déconnecté:", reason);
    });
  }, [playSound]);

  // Récupération des utilisateurs
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
    }
  }, []);

  // Sélection d'un utilisateur
  const handleUserClick = useCallback((user) => {
    setSelectedUser(user);
    setIsChatOpen(true);
    setMessages([]);
  }, []);

  // Envoi d'un message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedUser || !socketRef.current) {
      console.log("Impossible d'envoyer le message:", {
        messageVide: !newMessage.trim(),
        utilisateurNonSelectionne: !selectedUser,
        socketNonConnecte: !socketRef.current,
      });
      return;
    }

    console.log("Préparation de l'envoi du message:", {
      destinataire: selectedUser.email,
      message: newMessage,
      socketId: socketRef.current.id,
      socketConnecte: socketRef.current.connected,
    });

    const message = {
      text: newMessage,
      sender: "me",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, message]);
    playSound(messageSoundRef, "message envoyé");

    socketRef.current.emit("send_message", {
      to: selectedUser.email,
      message: newMessage,
    });
    console.log("Événement send_message émis au serveur");

    setNewMessage("");
  }, [newMessage, selectedUser, playSound]);

  // Envoi d'un wizz
  const handleWizz = useCallback(() => {
    if (!selectedUser || !socketRef.current) return;

    setIsWizzing(true);
    if (chatWindowRef.current) {
      chatWindowRef.current.classList.add("wizz-animation");
    }

    playSound(wizzSoundRef, "wizz");
    setShowWizzNotification(true);

    socketRef.current.emit("send_wizz", {
      to: selectedUser.email,
    });

    // Réinitialisation de l'animation
    setTimeout(() => {
      setIsWizzing(false);
      if (chatWindowRef.current) {
        chatWindowRef.current.classList.remove("wizz-animation");
      }
    }, WIZZ_ANIMATION_DURATION);

    // Masquage de la notification
    setTimeout(() => {
      setShowWizzNotification(false);
    }, WIZZ_NOTIFICATION_DURATION);
  }, [selectedUser, playSound]);

  // Fermeture du chat
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  // Gestion de la soumission du formulaire
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      handleSendMessage();
    },
    [handleSendMessage]
  );

  // Mémoisation des utilisateurs filtrés (si nécessaire)
  const filteredUsers = useMemo(() => {
    return users;
  }, [users]);

  return (
    <div className="dashboard">
      {showWelcomeMessage && (
        <div className="welcome-notification">
          <span className="welcome-icon">👋</span> Bonjour{" "}
          {userRef.current?.pseudo} !
        </div>
      )}

      <div className="friends-list">
        <h2>Mes amis</h2>
        <div className="friends-container">
          {filteredUsers.map((user) => (
            <FriendItem
              key={user.email}
              user={user}
              isSelected={selectedUser?.email === user.email}
              isOnline={onlineUsers.has(user.email)}
              onClick={() => handleUserClick(user)}
            />
          ))}
        </div>
      </div>

      {isChatOpen && selectedUser && (
        <div className="chat-window" ref={chatWindowRef}>
          <div className="chat-header">
            <h3>{selectedUser.pseudo}</h3>
            <button className="close-chat" onClick={handleCloseChat}>
              ×
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
          </div>

          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
            />
            <button type="submit" className="send-button">
              Envoyer
            </button>
            <button
              type="button"
              className="wizz-button"
              onClick={handleWizz}
              disabled={isWizzing}
            >
              Wizz!
            </button>
          </form>

          {showWizzNotification && (
            <div className="wizz-notification">
              Wizz envoyé à {selectedUser?.pseudo}!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
