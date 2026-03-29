import ToggleSwitch from "./ToggleSwitch";

function RegistrationSettings({ settings, updateField }) {
    return (
        <>
            <h2 style={{ textAlign: "center" }}>Inscriptions</h2>

            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: "20px",
                    justifyContent: "center",
                    gap: "10px"
                }}
            >
                <label>Privé</label>

                <ToggleSwitch
                    onChange={(value) =>
                        updateField("isPublic", value)
                    }
                    checked={settings.isPublic}
                />

                <label>Public</label>
            </div>

            <h2 style={{ textAlign: "center" }}>SMTP</h2>

            <input
                style={{ width: "100%", padding: "5px" }}
                placeholder="Host"
                value={settings.smtpHost}
                onChange={(e) =>
                    updateField("smtpHost", e.target.value)
                }
            />

            <input
                style={{ width: "100%", padding: "5px" }}
                placeholder="Port"
                value={settings.smtpPort}
                onChange={(e) =>
                    updateField("smtpPort", e.target.value)
                }
            />

            <input
                style={{ width: "100%", padding: "5px" }}
                placeholder="User"
                value={settings.smtpUser}
                onChange={(e) =>
                    updateField("smtpUser", e.target.value)
                }
            />

            <input
                style={{ width: "100%", padding: "5px" }}
                type="password"
                placeholder="Password"
                value={settings.smtpPassword}
                onChange={(e) =>
                    updateField("smtpPassword", e.target.value)
                }
            />

            <textarea
                style={{ width: "100%", minHeight: "120px" }}
                value={settings.emailTemplate}
                onChange={(e) =>
                    updateField("emailTemplate", e.target.value)
                }
            />
        </>
    );
}

export default RegistrationSettings;