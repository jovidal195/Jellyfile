# version 0.1.0
- initial deployable version

# version 0.0.2
- package pour tests de déploiement server

# version 0.0.1
- package pour tests de workflow github

# version 0.0.0
- implemented initial version

# the visual studio stuff
This file explains how Visual Studio created the project.

The following tools were used to generate this project:
- create-vite

The following steps were used to generate this project:
- Create react project with create-vite: `npm init --yes vite@latest jellyfile.client -- --template=react`.
- Update `vite.config.js` to set up proxying and certs.
- Update `App` component to fetch and display weather information.
- Create project file (`jellyfile.client.esproj`).
- Create `launch.json` to enable debugging.
- Create `nuget.config` to specify location of the JavaScript Project System SDK (which is used in the first line in `jellyfile.client.esproj`).
- Add project to solution.
- Update proxy endpoint to be the backend server endpoint.
- Add project to the startup projects list.
- Write this file.
