// Wizz
socket.on("wizz", ({ to, from, pseudo }) => {
  console.log("Wizz reçu de:", from, "pour:", to);
  console.log("Données du Wizz:", { to, from, pseudo });
  console.log("Socket ID de l'expéditeur:", socket.id);
  console.log("Utilisateurs connectés:", connectedUsers);

  const recipientSocketId = Object.keys(connectedUsers).find(
    (id) => connectedUsers[id].email === to
  );

  if (recipientSocketId) {
    console.log("Destinataire trouvé:", recipientSocketId);
    console.log("Envoi du Wizz au destinataire:", recipientSocketId);
    io.to(recipientSocketId).emit("receive_wizz", {
      from: from,
      pseudo: pseudo,
      to: to,
    });
    console.log("Wizz envoyé avec succès");
  } else {
    console.log("Destinataire non trouvé pour le Wizz:", to);
    console.log(
      "Liste des utilisateurs connectés:",
      Object.values(connectedUsers)
    );
  }
});

io.on("connection", (socket) => {
  console.log("🔌 Socket connecté :", socket.id);
  console.log("Headers:", socket.handshake.headers);
  console.log("Query:", socket.handshake.query);

  // Log tous les événements reçus
  socket.onAny((eventName, ...args) => {
    console.log(`Événement reçu: ${eventName}`, args);
  });

  // Test de connexion
  socket.on("test_connection", (data) => {
    console.log("Test de connexion reçu de", socket.id, ":", data);
    socket.emit("test_response", {
      status: "ok",
      message: "Connexion testée avec succès",
      socketId: socket.id,
    });
  });

  // Identification
  socket.on("set_identity", (userData) => {
    console.log("Événement set_identity reçu de", socket.id, ":", userData);

    if (!userData.email || !userData.pseudo) {
      console.error("Données d'identité invalides:", userData);
      socket.emit("error", { message: "Données d'identité invalides" });
      return;
    }

    connectedUsers[socket.id] = {
      email: userData.email,
      pseudo: userData.pseudo,
    };

    console.log(`✅ ${userData.email} (${userData.pseudo}) connecté`);
    console.log("Utilisateurs connectés:", connectedUsers);

    // Notifier tous les clients de la nouvelle connexion
    io.emit("user_connected", {
      email: userData.email,
      pseudo: userData.pseudo,
      socketId: socket.id,
    });

    // Envoyer la liste des utilisateurs connectés au nouveau client
    const connectedUsersList = Object.values(connectedUsers);
    socket.emit("users_connected", connectedUsersList);
  });

  // Message
  socket.on("send_message", ({ to, message }) => {
    console.log("Message envoyé à:", to);
    console.log("Utilisateurs connectés:", connectedUsers);

    const recipientSocketId = Object.keys(connectedUsers).find(
      (id) => connectedUsers[id].email === to
    );

    if (recipientSocketId) {
      console.log("Destinataire trouvé:", recipientSocketId);
      io.to(recipientSocketId).emit("receive_message", {
        from: connectedUsers[socket.id].email,
        pseudo: connectedUsers[socket.id].pseudo,
        message,
      });
    } else {
      console.log("Destinataire non trouvé pour:", to);
    }
  });

  // Typing indicator
  socket.on("typing", ({ to, isTyping }) => {
    console.log("Événement typing reçu:", { to, isTyping });
    console.log("Socket ID de l'expéditeur:", socket.id);
    console.log("Utilisateurs connectés:", connectedUsers);

    const recipientSocketId = Object.keys(connectedUsers).find(
      (id) => connectedUsers[id].email === to
    );

    if (recipientSocketId) {
      console.log("Envoi de l'événement user_typing à:", recipientSocketId);
      io.to(recipientSocketId).emit("user_typing", {
        from: connectedUsers[socket.id].email,
        pseudo: connectedUsers[socket.id].pseudo,
        isTyping,
      });
    } else {
      console.log("Destinataire non trouvé pour l'événement typing:", to);
    }
  });

  // Wizz
  socket.on("wizz", (data) => {
    console.log("Wizz reçu:", data);
    console.log("Socket ID de l'expéditeur:", socket.id);
    console.log("Utilisateurs connectés:", connectedUsers);

    const { to, from, pseudo } = data;
    const recipientSocketId = Object.keys(connectedUsers).find(
      (id) => connectedUsers[id].email === to
    );

    if (recipientSocketId) {
      console.log("Destinataire trouvé:", recipientSocketId);
      console.log("Envoi du Wizz au destinataire:", recipientSocketId);
      io.to(recipientSocketId).emit("receive_wizz", {
        from: from,
        pseudo: pseudo,
        to: to,
      });
      console.log("Wizz envoyé avec succès");
    } else {
      console.log("Destinataire non trouvé pour le Wizz:", to);
      console.log(
        "Liste des utilisateurs connectés:",
        Object.values(connectedUsers)
      );
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {
    const user = connectedUsers[socket.id];
    if (user) {
      console.log(`❌ ${user.email} (${user.pseudo}) déconnecté`);
      delete connectedUsers[socket.id];
    }
  });
});
