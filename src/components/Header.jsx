import React, { useState, useEffect } from "react";
import logo from "../assets/images/logo-le-reacteur.png";
import { Link, useNavigate } from "react-router-dom";
import "../assets/styles/Header.css";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const checkUser = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Erreur lors du parsing des données utilisateur:", error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUser();

    // Écouter les changements dans le localStorage
    window.addEventListener("storage", checkUser);

    return () => {
      window.removeEventListener("storage", checkUser);
    };
  }, []);

  // Vérifier l'état de l'utilisateur toutes les 500ms
  useEffect(() => {
    const interval = setInterval(checkUser, 500);
    return () => clearInterval(interval);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAuth = () => {
    if (user) {
      // Déconnexion
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      navigate("/login");
    } else {
      // Redirection vers la page de connexion
      navigate("/login");
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo-container">
          <img src={logo} alt="WizzMe Logo" className="logo" />
        </Link>

        {user && (
          <div className="user-info">
            <span className="user-name">Bonjour, {user.pseudo}</span>
          </div>
        )}

        <button className="menu-toggle" onClick={toggleMenu}>
          <span className={`hamburger ${isMenuOpen ? "active" : ""}`}></span>
        </button>

        <nav className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
          <ul className="nav-links">
            <li>
              <Link to="/" onClick={() => setIsMenuOpen(false)}>
                Accueil
              </Link>
            </li>
            <li>
              <Link to="/services" onClick={() => setIsMenuOpen(false)}>
                Services
              </Link>
            </li>
            <li>
              <Link to="/about" onClick={() => setIsMenuOpen(false)}>
                À propos
              </Link>
            </li>
            <li>
              <button className="auth-button" onClick={handleAuth}>
                {user ? "Se déconnecter" : "Se connecter"}
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
