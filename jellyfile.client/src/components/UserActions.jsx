export default function UserActions({ onClose }) {
    const handleLogout = async () => {
        const res = await fetch('http://localhost:5291/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (res.ok) {
            window.location.reload(); // force le refresh pour que App.jsx se rende compte que user n'est plus connecté
        } else {
            alert("Erreur lors de la déconnexion");
        }
    };

    const loadProfile = async () => {
        onClose();

        const res = await fetch('http://localhost:5291/api/profile', {
            method: 'GET',
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();
            const profile = document.querySelector(".profile");
            const fileZone = document.querySelector("#fileZone");
            const leftBox = document.querySelector(".left-box");

            profile.style.display = "initial";
            fileZone.style.display = "none";
            leftBox.style.display = "none";

            profile.querySelectorAll("input").forEach(input => {
                let key = input.name;
                try {
                    key = key[0].toLowerCase() + key.slice(1);
                } catch (err) {
                    //console.info(err);
                }
                input.value = data.profile?.[key] || "";
            });
        } else {
            const err = await res.json().catch(() => null);
            console.error("Erreur backend:", err);
            alert("Erreur lors du chargement du profil");
        }
    };

    return (
        <span className="user-actions">
            <button onClick={loadProfile}>Profil</button>
            <button onClick={handleLogout}>Déconnexion</button>
        </span>
    );
}
