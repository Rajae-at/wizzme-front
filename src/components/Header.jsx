import React, { useState } from "react";
import logo from "../assets/images/logo-le-reacteur.png";
import { Link } from "react-router-dom";
import "../assets/styles/Header.css";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
              <Link to="/contact" onClick={() => setIsMenuOpen(false)}>
                Se déconnecter
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
