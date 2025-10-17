import { useToast } from "./ToastProvider";
export default function menuProfil() {
    const toast = useToast();

    const btnSave = async (e) => {
        e.preventDefault();

        const form = document.querySelector("#userForm form");
        const formData = new FormData(form);
        const body = Object.fromEntries(formData.entries());

        const res = await fetch('http://localhost:5291/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        if (res.ok) {
            toast("success", "Profil sauvegardé !");
        } else {
            toast("error", "Impossible de sauvegarder le profil !");
        }
    }

    return (
        <div className="profile">
            <div id="userImg">img</div>
            <div id="userForm">
                <div>
                    <form>
                        <label>Prénom</label><input id="praenomen" name="FirstName"></input>
                        <label>Nom</label><input id="nomen" name="LastName"></input>
                        <label>Courriel</label><input id="email" name="Email"></input>
                        <label>Téléphone</label><input id="phone" name="Phone"></input>
                        <br />
                    </form>
                    <button onClick={btnSave}>Sauvegarder</button>
                </div>
            </div>
        </div>
    );
}