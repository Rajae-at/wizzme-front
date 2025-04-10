import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../assets/styles/Home.css";

const Home = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [users, setUsers] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  // Fonction pour se connecter
  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:3000/users/login", {
        email,
        password,
      });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify({ email, pseudo }));
      navigate("/dashboard");
    } catch (error) {
      console.error("Erreur de connexion:", error);
      alert("Échec de la connexion.");
    }
  };

  // Fonction pour s'inscrire
  const handleRegister = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3000/users/register",
        { email, pseudo, password }
      );
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify({ email, pseudo }));
      navigate("/dashboard");
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      alert("Échec de l'inscription.");
    }
  };

  // Récupérer les utilisateurs depuis le backend
  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:3000/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to fetch users.");
    }
  };

  useEffect(() => {
    fetchUsers(); // Récupère les utilisateurs dès que le composant est monté
  }, []);

  return (
    <div className="home-container">
      <div className="auth-container">
        <h2>{isRegistering ? "Inscription" : "Connexion"}</h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        {isRegistering && (
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Pseudo"
          />
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
        />
        <button onClick={isRegistering ? handleRegister : handleLogin}>
          {isRegistering ? "S'inscrire" : "Se connecter"}
        </button>
        <button
          className="switch-auth-mode"
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering
            ? "Déjà un compte ? Se connecter"
            : "Pas de compte ? S'inscrire"}
        </button>
      </div>
    </div>
  );
};

export default Home;
