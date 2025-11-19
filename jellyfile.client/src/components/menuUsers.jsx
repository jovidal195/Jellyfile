import { useToast } from "./ToastProvider";
import { useState, useEffect } from "react";
//import { bindEnterForVisible } from "../utils/bindEnterForVisible";
import { bindEnterForVisible } from "../utils/bindEnterForVisible";
import UserProfile from "./userProfile";
import Modal from "./Modal";
import DataTable from "react-data-table-component";
import ToggleSwitch from "./ToggleSwitch";
import Select from 'react-select';

export default function menuUsers({ users, setUsers }) {
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [filterText, setFilterText] = useState("");

    const toast = useToast();

    const openModal = (mode, row) => {
        setSelectedUserId(row?.id || null);
        setModalMode(mode);
        setModalOpen(true);
    };

    const copyInvite = (email) => {
        fetch("/api/users/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            navigator.clipboard.writeText(data.link);
            toast("success",`Lien d'invitation copié pour ${email}`);
        })
        .catch(err => {
            console.error(err);
            toast("error" ,`Erreur pour ${email}`);
        });
    }

    const columns = [
        { name: "ID", selector: row => row.id, sortable: true, omit: true }, // masqué
        { name: "Nom d’utilisateur", selector: row => row.username, sortable: true },
        { name: "Rôle", selector: row => row.role, sortable: true },
        { name: "Quota", selector: row => `${(row.storageUsedBytes / 1024 / 1024 / 1024).toFixed(2)}/${(row.storageQuotaBytes / 1024 / 1024 / 1024).toFixed(2)} Go`, sortable: true },
        { name: "Prénom", selector: row => row.profile?.firstName ?? "" },
        { name: "Nom", selector: row => row.profile?.lastName ?? "" },
        { name: "Courriel", selector: row => row.profile?.email ?? "" },
        {
            name: "Actif",
            cell: (row, index) => (
                <ToggleSwitch
                    checked={row.active}
                    onChange={async val => {
                        console.log(row);
                        try {
                            await fetch(`/api/Users/${row.id}/active`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(val)
                            });

                            setUsers(prev => {
                                const copy = [...prev];
                                copy[index].active = val;
                                return copy;
                            });

                        } catch (err) {
                            console.error(err);
                            toast("error", err.message);
                        }
                    }}
                    locked={row.username === "admin"}
                />
            )
        },
        {
            name: "Invitation",
            cell: row => (
                <button
                    onClick={() => copyInvite(row.username)}
                >
                    Copier
                </button>
            )
        },
        {
            name: "Profil",
            cell: row => (
                <button
                    onClick={() => openModal("profileUser", row)}
                >
                    Modifier
                </button>
            )
        }
    ];

    const filteredItems = users.filter(
        u => u.username.toLowerCase().includes(filterText.toLowerCase()) ||
            u.profile?.firstName?.toLowerCase().includes(filterText.toLowerCase()) ||
            u.profile?.lastName?.toLowerCase().includes(filterText.toLowerCase()) ||
            u.profile?.email?.toLowerCase().includes(filterText.toLowerCase())
    );

    const subHeader = (
        <div className="btn-utilisateur-container">
            <input
                type="text"
                placeholder="Recherche..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button
                onClick={() => openModal("addUser", null)}
                className="btn-gestion-utilisateurs"
            >
                Ajouter un utilisateur
            </button>
            <button
                onClick={() => openModal("deleteUser", null)}
                className="btn-gestion-utilisateurs"
            >
                Supprimer un utilisateur
            </button>
        </div>
    );

    const refreshUsers = async() => {
        try {
            const res = await fetch("/api/Users/all");
            if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs");
            const data = await res.json();
            setUsers(data);  // mets à jour ton state
        } catch (err) {
            toast("error", err.message); // toast fonctionne correctement
        }
    }

    const createUser = async () => {
        try {
            const newUserForm = document.querySelector("#newUserForm")
            const formData = new FormData(newUserForm);
            const body = Object.fromEntries(formData.entries());
            console.log(body);
            const res = await fetch(`/api/users/register`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const text = await res.text();
            if (res.status === 409) {
                toast("error", text);
            } else if (res.status === 401 || res.status === 403 || res.status === 405) {
                toast("error", res.statusText);
            } else {
                toast("success", "Utilisateur sauvegardé");
                setModalOpen(false);
            }

            refreshUsers()        
        } catch (err) {
            console.error(err);
            toast("error", "L'utilisateur n'a pas été créer");
            setModalOpen(false);
        }
    };

    const removeUser = async () => {
        try {
            const res = await fetch(`/api/users/remove/${selectedUserId}`, {
                method: "DELETE",
                credentials: "include"
            });
            const text = await res.text();
            if (res.status === 409) {
                toast("error", text);
            } else if (res.status === 401 || res.status === 403 || res.status === 405) {
                toast("error", res.statusText);
            } else {
                toast("success", "Utilisateur supprimé");
                setModalOpen(false);
            }

            refreshUsers()
        } catch (err) {
            console.error(err);
            toast("error", "L'utilisateur n'a pas été supprimer");
            setModalOpen(false);
        }
    };

    const userOptions = users.map(u => ({ value: u.id, label: u.username }));

    const saveProfile = async () => {

        const form = document.querySelector("#userProfileForm form");
        const formData = new FormData(form);
        const body = Object.fromEntries(formData.entries());

        if (selectedUserId != null) {
            body.UserId = selectedUserId;
        }


        const res = await fetch('/api/profile', {
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
        setModalOpen(false);
        refreshUsers()
    }

    useEffect(() => {
        if (modalMode === "addUser" && isModalOpen) {
            const unbind = bindEnterForVisible("#newUserForm", createUser);
            return unbind; // détache le listener quand le modal se ferme
        }
        if (modalMode === "profileUser" && isModalOpen) {
            const user = users.find(u => u.id === selectedUserId);
            const profile = document.querySelector("#userProfileForm");
            if (!profile || !user) return;

            profile.querySelectorAll("input, select").forEach(input => {
                let key = input.name;
                key = key.charAt(0).toLowerCase() + key.slice(1);
                input.value = user.profile?.[key] || "";
                
                if (key == "storageQuotaBytes") {
                    input.value = user[key] || ""
                }
            });
        }
    }, [modalMode, isModalOpen]);

    return (
        <div className="users submenus">

            {/* TABLEAU USERS */}
            <h2>Gestion des utilisateurs</h2>


            <DataTable
                columns={columns}
                data={filteredItems}
                pagination
                highlightOnHover
                selectableRows={false}
                persistTableHead
                subHeader
                subHeaderComponent={subHeader}
                noHeader
            />

            {/* MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                {modalMode === "addUser" && ( <div>
                    <h3>Ajouter un utilisateur</h3>
                    <form style={{ 'display': 'grid' }} id="newUserForm">
                        <label>Utilisateur</label><input type="text" style={{ "padding": "8px" }} name="username"></input>
                    </form>
                    <div style={{ marginTop: "10px" }}>
                        <button onClick={() => setModalOpen(false)}>Annuler</button>
                        <button onClick={createUser}>Confirmer</button>
                    </div>
                </div>)}
                {modalMode === "deleteUser" && (<div>
                    <h3>Ajouter un utilisateur</h3>
                    <form style={{ 'display': 'grid' }} id="deleteUserForm">
                    <label>Utilisateur</label>
                    <Select
                        options={userOptions}
                        value={userOptions.find(u => u.value === selectedUserId)}
                        id="deleteUser"
                        onChange={option => setSelectedUserId(option.value)}
                        placeholder="Sélectionnez un utilisateur"
                        />
                    </form>
                    <div style={{ marginTop: "10px" }}>
                        <button onClick={() => setModalOpen(false)}>Annuler</button>
                        <button onClick={removeUser}>Confirmer</button>
                    </div>
                </div>)}
                {modalMode === "profileUser" && (<div>
                    <h3>Profil utilisateur</h3>
                    <div id="userProfileForm">
                        <UserProfile user={{"role":"Admin"}} />
                    </div>
                    <div style={{ marginTop: "10px" }}>
                        <button onClick={() => setModalOpen(false)}>Annuler</button>
                        <button onClick={saveProfile}>Confirmer</button>
                    </div>
                </div>)}
            </Modal>
        </div>
    );
}