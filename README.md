# Jellyfile
Jellyfile est une plateforme web permettant de centraliser le stockage et le partage de fichiers sur un serveur. Elle offre une interface simple pour téléverser, organiser et télécharger des fichiers, avec un accès contrôlé pour un groupe restreint d’utilisateurs. L’objectif est de fournir une solution autonome, facile à déployer et adaptée à un usage privé ou à petite échelle, sans dépendre de services externes.

## Déploiement

Jellyfile est fourni sous forme de release précompilée.  
L’utilisateur n’a pas besoin de compiler le projet.

Le déploiement consiste à télécharger l’archive, la décompresser et exécuter le serveur.

### Prérequis

- Runtime .NET 8 installé sur le serveur
- Accès à une machine (Linux recommandé, ex : Ubuntu)
- Possibilité d’exécuter des applications en ligne de commande

## Installation

### 1. Télécharger la release
Récupérer le fichier `.zip` depuis la section **Releases** du dépôt.

### 2. Extraire l’archive

```bash id="unzip01"
unzip Jellyfile_vX.X.X.zip
```

### 3. Lancer Jellyfile

```bash
cd Jellyfile.Server
dotnet Jellyfile.Server.dll
```

## Développeur

C'est moi, jovidal195, le développeur de l'application.
 
<details>
  <summary>Vous voulez m'aider?</summary>
  attention le e-begging arrive ಥ_ಥ
</details> 
<a href="https://ko-fi.com/jello195"><img src="https://www.ko-fi.com/img/githubbutton_sm.svg" alt="Support me on ko-fi"></img></a>

## License

Jellyfile is licensed under the MIT License.

See the [LICENSE](LICENSE.md) file for details.