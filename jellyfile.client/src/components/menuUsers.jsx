import { useToast } from "./ToastProvider";
import { useEffect, useRef, useState } from "react";
import { bindEnterForVisible } from "../utils/bindEnterForVisible";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import Modal from "./Modal";

export default function menuProfil() {
    const [isModalOpen, setModalOpen] = useState(false);

    const toast = useToast();
    

    /*useEffect(() => {
        // Bind Enter seulement quand .profile est visible
        const unbind = bindEnterForVisible(".profile", btnSave);

        // Nettoyage si le composant se démonte
        return () => unbind();
    }, []);*/

    return (
        <div className="Users submenus">

            {/* IMAGE + OVERLAY */}
            <div>Hello World!!!</div>

            {/* MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
              
            </Modal>
        </div>
    );
}