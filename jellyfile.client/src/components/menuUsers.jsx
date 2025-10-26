import { useToast } from "./ToastProvider";
import { useState, useEffect } from "react";
//import { bindEnterForVisible } from "../utils/bindEnterForVisible";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
//import { faUser, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import Modal from "./Modal";
import DataTable from "react-data-table-component";
import ToggleSwitch from "./ToggleSwitch";

export default function menuProfil() {
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState(null);
    const [users, setUsers] = useState([]);
    const [filterText, setFilterText] = useState("");

    const toast = useToast();

    const openModal = (mode) => {
        setModalMode(mode);
        setModalOpen(true);
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("/api/Users/all");
                if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs");
                const data = await res.json();
                setUsers(data);
            } catch (err) {
                toast("error", err.message);
            }
        };
        fetchUsers();
    }, [toast]);

    const copyInvite = (email) => {
        fetch("/api/invite/generate", {
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
        { name: "Quota", selector: row => (row.storageQuotaBytes / 1024 / 1024 / 1024).toFixed(2) + " Go", sortable: true },
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
                    Voir
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
                onClick={() => openModal("addUser")}
                className="btn-gestion-utilisateurs"
            >
                Ajouter un utilisateur
            </button>
            <button
                onClick={() => alert("Supprimer utilisateur")}
                className="btn-gestion-utilisateurs"
            >
                Supprimer un utilisateur
            </button>
        </div>
    );

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
                    <form style={{ 'display': 'grid' }}>
                        <label>Utilisateur</label><input type="text" style={{ "padding" : "8px" }}></input>
                    </form>
                    <div style={{ marginTop: "10px" }}>
                        <button onClick={() => setModalOpen(false)}>Annuler</button>
                        <button onClick={() => {
                            toast("success", "Utilisateur sauvegardé !");
                            setModalOpen(false);
                        }}>Confirmer</button>
                    </div>
                </div>)}
                {modalMode === "deleteUser" && (<div>
                    <h3>Ajouter un utilisateur</h3>
                    <label>Utilisateur</label><select><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>
                    <div style={{ marginTop: "10px" }}>
                        <button onClick={() => setModalOpen(false)}>Annuler</button>
                        <button onClick={() => {
                            toast("success", "Avatar sauvegardé !");
                            setModalOpen(false);
                        }}>Confirmer</button>
                    </div>
                </div>)}
            </Modal>
        </div>
    );
}