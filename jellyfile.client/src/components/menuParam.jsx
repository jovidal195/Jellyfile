import { useEffect, useState } from "react";
import { useToast } from "./ToastProvider";
import ToggleSwitch from "./ToggleSwitch";
import RegistrationSettings from "./RegistrationSettings";

function MenuParam({ isAdmin }) {
    const toast = useToast();

    const colorKeys = [
        "--login-bg",
        "--login-text",
        "--login-input-bg",
        "--login-input-text",
        "--login-button-bg",
        "--login-button-text",
        "--login-button-hover",
        "--interface-bg",
        "--interface-leftbox-bg",
        "--interface-text"
    ];

    const [activeTheme, setActiveTheme] = useState("light");

    const [settings, setSettings] = useState({
        applicationName: "",
        logoPath: "",
        isPublic: false,
        smtpHost: "",
        smtpPort: "",
        smtpUser: "",
        smtpPassword: "",
        smtpUseSsl: true,
        emailTemplate: "",
        light: {},
        dark: {}
    });

    // Transform backend → frontend structure
    const mapBackendToState = (data) => {
        const buildTheme = (prefix) => {
            const theme = {};
            colorKeys.forEach((key) => {
                const camel = key
                    .replace("--", "")
                    .replace(/-([a-z])/g, (_, c) => c.toUpperCase());

                const backendKey = `${prefix}_${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
                theme[key] = data[backendKey] || "";
            });
            return theme;
        };

        return {
            applicationName: data.applicationName || "",
            logoPath: data.logoPath || "",
            isPublic: data.isPublic ?? false,
            smtpHost: data.smtpHost || "",
            smtpPort: data.smtpPort || "",
            smtpUser: data.smtpUser || "",
            smtpPassword: data.smtpPassword || "",
            smtpUseSsl: data.smtpUseSsl ?? true,
            emailTemplate: data.emailTemplate || "",
            light: buildTheme("light"),
            dark: buildTheme("dark")
        };
    };

    const writePreviewCss = (settings) => {
        let styleTag = document.getElementById("theme-preview-css");

        if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = "theme-preview-css";
            document.head.appendChild(styleTag);
        }

        styleTag.textContent = `
        :root {
            --app-name: "${settings.applicationName || "Jellyfile"}";
        }

        :root[data-theme="light"] {
            --login-bg: ${settings.light?.["--login-bg"] || "#f4f4f4"};
            --login-text: ${settings.light?.["--login-text"] || "#213547"};
            --login-input-bg: ${settings.light?.["--login-input-bg"] || "#ffffff"};
            --login-input-text: ${settings.light?.["--login-input-text"] || "#213547"};
            --login-button-bg: ${settings.light?.["--login-button-bg"] || "#e53935"};
            --login-button-text: ${settings.light?.["--login-button-text"] || "#ffffff"};
            --login-button-hover: ${settings.light?.["--login-button-hover"] || "#ad2b28"};
            --interface-bg: ${settings.light?.["--interface-bg"] || "#ffffff"};
            --interface-leftbox-bg: ${settings.light?.["--interface-leftbox-bg"] || "#f4f4f4"};
            --interface-text: ${settings.light?.["--interface-text"] || "#808080"};
        }

        :root[data-theme="dark"] {
            --login-bg: ${settings.dark?.["--login-bg"] || "#242424"};
            --login-text: ${settings.dark?.["--login-text"] || "rgba(255,255,255,0.87)"};
            --login-input-bg: ${settings.dark?.["--login-input-bg"] || "#333"};
            --login-input-text: ${settings.dark?.["--login-input-text"] || "#ffffff"};
            --login-button-bg: ${settings.dark?.["--login-button-bg"] || "#6498ff"};
            --login-button-text: ${settings.dark?.["--login-button-text"] || "#ffffff"};
            --login-button-hover: ${settings.dark?.["--login-button-hover"] || "#90b4fc"};
            --interface-bg: ${settings.dark?.["--interface-bg"] || "#242424"};
            --interface-leftbox-bg: ${settings.dark?.["--interface-leftbox-bg"] || "#333"};
            --interface-text: ${settings.dark?.["--interface-text"] || "#ffffff"};
        }
        `;
            };

    // Load backend
    useEffect(() => {
        const loadSettings = async () => {
            const res = await fetch("/api/AppSettings", {
                credentials: "include"
            });

            if (!res.ok) return;

            const data = await res.json();
            setSettings(mapBackendToState(data));
        };

        loadSettings();
    }, []);

    // Apply theme
    useEffect(() => {
        writePreviewCss(settings);
    }, [settings]);

    const updateField = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const updateColor = (theme, key, value) => {
        setSettings((prev) => ({
            ...prev,
            [theme]: {
                ...prev[theme],
                [key]: value
            }
        }));
    };

    // Transform frontend → backend format
    const mapStateToBackend = (s) => {
        const flatten = (theme, prefix) => {
            const obj = {};

            Object.entries(theme).forEach(([cssVar, value]) => {
                const key = cssVar
                    .replace("--", "")
                    .split("-")
                    .map((part, i) =>
                        i === 0
                            ? part
                            : part.charAt(0).toUpperCase() + part.slice(1)
                    )
                    .join("");

                const backendKey =
                    prefix +
                    "_" +
                    key.charAt(0).toUpperCase() +
                    key.slice(1);

                obj[backendKey] = value;
            });

            return obj;
        };

        return {
            applicationName: s.applicationName,
            logoPath: s.logoPath,
            isPublic: s.isPublic,
            smtpHost: s.smtpHost,
            smtpPort: s.smtpPort,
            smtpUser: s.smtpUser,
            smtpPassword: s.smtpPassword,
            smtpUseSsl: s.smtpUseSsl,
            emailTemplate: s.emailTemplate,
            ...flatten(s.light, "Light"),
            ...flatten(s.dark, "Dark")
        };
    };

    const save = async () => {
        const payload = mapStateToBackend(settings);

        const res = await fetch("/api/AppSettings", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            document.documentElement.style.setProperty(
                "--app-name",
                `"${settings.applicationName}"`
            );
            window.dispatchEvent(new Event("appSettingsUpdated"));

            toast("success", "Sauvegardé");
        }
    };

    return (
        <div className="param submenus">
            <h2 style={{ textAlign: "center" }}>Nom de l'application</h2>

            <input
                style={{ width: "100%", padding: "5px" }}
                type="text"
                value={settings.applicationName}
                onChange={(e) => updateField("applicationName", e.target.value)}
            />

            <h2 style={{ textAlign: "center" }}>Jeu de couleurs</h2>

            <table className="theme-table">
                <thead>
                    <tr>
                        <th>Variable</th>
                        <th>Light</th>
                        <th>Dark</th>
                    </tr>
                </thead>

                <tbody>
                    {colorKeys.map((key) => (
                        <tr key={key}>
                            <td>{key}</td>

                            <td>
                                <input
                                    type="color"
                                    value={settings.light?.[key] || "#000000"}
                                    onChange={(e) =>
                                        updateColor("light", key, e.target.value)
                                    }
                                />
                            </td>

                            <td>
                                <input
                                    type="color"
                                    value={settings.dark?.[key] || "#000000"}
                                    onChange={(e) =>
                                        updateColor("dark", key, e.target.value)
                                    }
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/*
                <RegistrationSettings
                settings={settings}
                updateField={updateField}
            />
            */}

            <button onClick={save} style={{ marginTop: "12px" }}>
                Sauvegarder
            </button>
        </div>
    );
}

export default MenuParam;