import { useToast } from "./ToastProvider";
import { useState } from "react";
import ToggleSwitch from "./ToggleSwitch";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

export default function UserActions({ user, onClose, return2main, setUsers, toggleTheme, theme}) {
    const toast = useToast();

    const handleLogout = async () => {
        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (res.ok) {
            window.location.reload(); // force le refresh pour que App.jsx se rende compte que user n'est plus connecté
        } else {
            alert("Erreur lors de la déconnexion");
        }
    };

    const pagesHideAndDisplay = (displayable) => {
        const rightBox = document.querySelector(".right-box");
        rightBox.querySelectorAll(":scope > div").forEach(div => {
            div.style.display = "none";
        });
        const display = document.querySelector(displayable);
        display.style.display = "initial";
    };

    const loadProfile = async () => {
        onClose();

        const res = await fetch('/api/profile', {
            method: 'GET',
            credentials: 'include'
        });

        if (res.ok) {
            pagesHideAndDisplay(".profile");

            const data = await res.json();
            const profile = document.querySelector(".profile");
            const leftBox = document.querySelector(".left-box");
            leftBox.style.display = "none";

            profile.querySelectorAll("input, select").forEach(input => {
                let key = input.name;
                input.value = data.profile?.[key] || "";
            });
        } else {
            const err = await res.json().catch(() => null);
            console.error("Erreur backend:", err);
            toast("error", "Erreur lors du chargement du profil");
        }
    };

    const loadUsers = async () => {
        onClose();
        pagesHideAndDisplay(".users");
        const leftBox = document.querySelector(".left-box");
        leftBox.style.display = "none";

        try {
            const res = await fetch("/api/Users/all");
            if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs");
            const data = await res.json();
            setUsers(data);  // mets à jour ton state
        } catch (err) {
            toast("error", err.message); // toast fonctionne correctement
        }
    };

    const loadParam = async () => {
        onClose();
        pagesHideAndDisplay(".param");
        const leftBox = document.querySelector(".left-box");
        leftBox.style.display = "none";

    };

    return (
        <span className="user-actions">
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: "20px", justifyContent: "center" }}><FontAwesomeIcon icon={faSun} /><ToggleSwitch onChange={toggleTheme} checked={theme === "dark"} /><FontAwesomeIcon icon={faMoon} /></div>
            <button onClick={return2main}>Home</button>
            <button onClick={loadProfile}>Profil</button>
            {user?.role === "Admin" && (
                <>
                <button onClick={loadUsers}>Users</button>
                <button onClick={loadParam}>Paramètres</button>
                </>
            )}
            <button onClick={handleLogout}>Déconnexion</button>
        </span>
    );
}
