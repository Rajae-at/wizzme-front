import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const PORT = process.env.PORT || 3000;
const CLIENT_URL = "http://localhost:5173";

// Initialisation de l'application
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Stockage des utilisateurs connectés
const connectedUsers = {};

// Utilitaires
const findUserSocketId = (email) => {
  return Object.keys(connectedUsers).find(
    (key) => connectedUsers[key].email === email
  );
};

const emitToUser = (socketId, event, data) => {
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

const broadcastUserStatus = (email, status) => {
  io.emit("user_status_change", { email, status });
};

// Middleware d'authentification
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
};

io.use(authenticateSocket);

// Gestion des connexions socket
io.on("connection", (socket) => {
  console.log("Nouvelle connexion socket:", socket.id);
  console.log("Données d'authentification:", socket.handshake.auth);

  // Vérification de l'authentification
  const token = socket.handshake.auth.token;
  const email = socket.handshake.auth.email;
  const pseudo = socket.handshake.auth.pseudo;

  if (!token || !email) {
    console.error("Connexion rejetée - Données d'authentification manquantes");
    socket.emit("error", { message: "Données d'authentification manquantes" });
    socket.disconnect();
    return;
  }

  try {
    // Vérification du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.email !== email) {
      throw new Error("Email ne correspond pas au token");
    }
  } catch (err) {
    console.error("Erreur d'authentification:", err.message);
    socket.emit("error", { message: "Token invalide" });
    socket.disconnect();
    return;
  }

  // Ajout de l'utilisateur à la liste des utilisateurs connectés
  connectedUsers[email] = {
    socketId: socket.id,
    email: email,
    pseudo: pseudo || email,
  };
  console.log("Utilisateur connecté:", email, "avec socket ID:", socket.id);

  // Envoi de la liste initiale des utilisateurs en ligne
  const onlineUsersList = Object.keys(connectedUsers);
  console.log("Liste des utilisateurs en ligne:", onlineUsersList);
  socket.emit("initial_online_users", onlineUsersList);

  // Gestion de l'identité
  socket.on("set_identity", (data) => {
    console.log("Identité reçue:", data);
    if (data.email && data.pseudo) {
      if (data.email !== email) {
        console.error("Tentative de changement d'identité non autorisée");
        socket.emit("error", { message: "Changement d'identité non autorisé" });
        return;
      }
      connectedUsers[data.email] = {
        socketId: socket.id,
        email: data.email,
        pseudo: data.pseudo,
      };
      broadcastUserStatus(data.email, "online");
    }
  });

  // Gestion des messages
  socket.on("send_message", (data) => {
    console.log("Message reçu sur le serveur:", data);
    console.log("État actuel des utilisateurs connectés:", connectedUsers);

    if (!data.to || !data.message) {
      console.error("Message invalide - données manquantes");
      socket.emit("error", { message: "Format de message invalide" });
      return;
    }

    const recipient = connectedUsers[data.to];
    console.log("Recherche du destinataire:", data.to);
    console.log("Informations du destinataire trouvé:", recipient);

    if (!recipient) {
      console.error("Destinataire non trouvé:", data.to);
      socket.emit("error", { message: "Destinataire non trouvé" });
      return;
    }

    console.log("Envoi du message à:", data.to);
    console.log("Socket ID du destinataire:", recipient.socketId);
    console.log("Informations de l'expéditeur:", {
      email: email,
      pseudo: connectedUsers[email].pseudo,
    });

    io.to(recipient.socketId).emit("receive_message", {
      message: data.message,
      from: email,
      pseudo: connectedUsers[email].pseudo,
      timestamp: new Date().toISOString(),
    });

    console.log("Message envoyé avec succès au destinataire");
  });

  // Gestion des wizz
  socket.on("send_wizz", (data) => {
    console.log("Wizz reçu pour:", data.to);
    if (!data.to) {
      console.error("Wizz invalide - destinataire manquant");
      socket.emit("error", { message: "Destinataire du wizz manquant" });
      return;
    }

    const recipient = connectedUsers[data.to];
    if (!recipient) {
      console.error("Destinataire du wizz non trouvé:", data.to);
      socket.emit("error", { message: "Destinataire du wizz non trouvé" });
      return;
    }

    console.log("Envoi du wizz à:", data.to, "via socket:", recipient.socketId);
    io.to(recipient.socketId).emit("receive_wizz", {
      from: email,
      pseudo: connectedUsers[email].pseudo,
      timestamp: new Date().toISOString(),
    });
  });

  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    console.log("Déconnexion:", socket.id);
    const userEmail = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key].socketId === socket.id
    );

    if (userEmail) {
      console.log("Utilisateur déconnecté:", userEmail);
      delete connectedUsers[userEmail];
      broadcastUserStatus(userEmail, "offline");
    }
  });
});

// Démarrage du serveur
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
