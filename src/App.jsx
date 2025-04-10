import React, { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [users, setUsers] = useState([]);
  const [token, setToken] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // Fonction pour se connecter
  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:3000/users/login", {
        email,
        password,
      });
      setToken(response.data.token);
      setLoggedIn(true);
      alert("Logged in successfully!");
    } catch (error) {
      console.error("Error logging in:", error);
      alert("Failed to log in.");
    }
  };

  // Fonction pour s'inscrire
  const handleRegister = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3000/users/register",
        { email, pseudo, password }
      );
      setToken(response.data.token);
      setLoggedIn(true);
      alert("Registered successfully!");
    } catch (error) {
      console.error("Error registering:", error);
      alert("Failed to register.");
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
    if (loggedIn) {
      fetchUsers(); // Récupère les utilisateurs dès que l'utilisateur est connecté
    }
  }, [loggedIn]);

  return (
    <div>
      {!loggedIn ? (
        <div>
          <h2>Login or Register</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleRegister}>Register</button>
        </div>
      ) : (
        <div>
          <h2>Welcome, {pseudo}</h2>
          <h3>Users</h3>
          {users.map((user) => (
            <div key={user.email}>
              <span>{user.pseudo}</span>
              <button onClick={() => alert(`Send message to ${user.pseudo}`)}>
                Send Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
