import React from "react";
import { useNavigate } from "react-router-dom";
import '../styles/MainMenu.css';

const MainMenu = () => {
    const navigate = useNavigate();
    return(
        <div className="container-menu">
            <h1>Main Menu</h1>
            <div className="menu">
                <button className="menu-button" onClick={() => navigate("/collection")}>Collection</button>
            </div>
        </div>
    )
}

export default MainMenu;