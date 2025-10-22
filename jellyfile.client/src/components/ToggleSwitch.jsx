import React from "react";
import "./ToggleSwitch.css";

export default function ToggleSwitch({ checked, onChange, locked = false }) {

    return (
        <label className="switch">
            <input
                type="checkbox"
                checked={checked} 
                onChange={e => {
                    if (!locked) {
                        onChange(e.target.checked);
                    }
                }}
                disabled={locked}  
            />
            <span className="slider round"></span>
        </label>
    );
}
