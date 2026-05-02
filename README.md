# Super Galaxy Earth 🌍✨

Ce projet est une expérience interactive en 3D représentant une "Super Terre" stylisée (inspirée de Mario Galaxy) avec des reliefs exagérés et des cycles jour/nuit.

## 🛠 Technologies Utilisées

Ce projet repose sur une stack moderne axée sur la 3D et l'IA :

*   **React 19 & Vite** : Framework UI et outil de build rapide.
*   **Three.js** : Moteur de rendu 3D WebGL.
*   **React Three Fiber (R3F)** : Connecteur permettant d'utiliser Three.js de manière déclarative dans React.
*   **React Three Drei** : Collection d'aides et d'abstractions pour R3F (OrbitControls, Stars, useGLTF, etc.).

*   **TailwindCSS** : Framework CSS pour l'interface utilisateur (UI).

## 🚀 Comment ça marche ?

### 1. Le Moteur de Rendu (Le Cœur)
L'application utilise un `<Canvas>` de R3F qui crée une scène WebGL. À l'intérieur, nous ne manipulons pas le DOM classique, mais des objets 3D (Mesh, Light, Camera).
React gère l'état (positions, interactions) et R3F met à jour la scène 3D à chaque frame (60 fois par seconde).

### 2. La Planète "Mario Earth" (Shaders Personnalisés)
L'aspect unique de la planète n'est pas une simple texture. C'est un **Shader Modifié** en temps réel :
*   Le composant `MarioEarth.tsx` utilise une `meshStandardMaterial`.
*   Via `onBeforeCompile`, nous injectons du code GLSL directement dans le shader de Three.js.
*   **Relief Exagéré** : Le Vertex Shader lit une texture de hauteur (`displacementMap`) et pousse les sommets vers l'extérieur pour créer des montagnes très prononcées, donnant cet effet "planète jouet".
*   **Lumières de Nuit** : Le Fragment Shader détecte les zones d'ombre (côté nuit) et y affiche une texture de lumières de ville (`earth_lights`), créant un cycle jour/nuit dynamique quand la terre tourne.

### 3. Navigation & Animations (Mathématiques Vectorielles)
*   **Orbital** : `OrbitControls` permet de tourner autour de la terre.
*   **Atterrissage (Landing)** : Lorsqu'on clique sur une ville, le composant `MeteorZoom` prend le relais.
    *   Il calcule une trajectoire fluide entre la position actuelle de la caméra et une position cible au-dessus de la ville.
    *   Il utilise l'interpolation linéaire (`lerp`) pour déplacer la caméra et la cible (`lookAt`) image par image, créant une transition douce sans coupure.

### 4. Monuments 3D
Chaque destination possède un modèle 3D unique posé sur le globe :
*   **Tour Eiffel** (Paris) — `.obj`
*   **Moulin à vent** (Amsterdam) — `.glb`
*   **Parthénon** (Athènes) — `.glb`
*   **Big Ben** (Londres) — `.glb`
*   **Pyramide de Gizeh** (Le Caire) — `.glb`

Les monuments sont orientés selon la normale à la surface du globe (quaternion) et marqués par des **faisceaux lumineux** animés (LightBeacon) visibles en mode orbital.

### 5. Éclairage Dynamique
*   **Soleil** : Point light principal avec halo visuel.
*   **Lumière d'ambiance** : Contre-jour violet pour les zones sombres.
*   **Torche caméra** : Un spotlight directionnel qui suit la caméra et s'active automatiquement uniquement lorsque le monument est du côté nuit de la planète (basé sur le dot product entre la normale de surface et la direction du soleil).

### 6. Interface de Destination
Lorsqu'on atterrit sur une ville :
*   **Destinations visitées** (Eiffel, Windmill, Parthenon) : Affichage des photos souvenirs dans des cadres en verre avec effet polaroid et une carte description.
*   **Nouvelles destinations** (Big Ben, Pyramide, et villes génériques) : Une carte de proposition "Do you want to choose {city} for our next trip together?" avec boutons accepter/refuser.
*   Les photos s'adaptent à leur orientation (portrait/paysage) grâce à un conteneur flexible.

### 7. Upload de Photos & Backend

L'app inclut un backend Express leger pour uploader et stocker des photos par destination :
*   **Burger menu** (en haut a droite) ouvre un side panel avec la galerie photo.
*   **Upload** : Bouton "+" en bas du panel pour ajouter des photos (max 10MB, formats image).
*   **Suppression** : Bouton "X" au hover sur les photos uploadees, avec dialog de confirmation.
*   **Persistance** : Photos stockees sur le filesystem dans `data/photos/{ville}/`, metadonnees dans `data/photos.json`.
*   **API** : Express 5 + Multer, endpoints REST simples.

## 📁 Structure du Projet

```
App.tsx                          # Scene principale : Canvas, camera, eclairage, UI
server.js                        # Backend Express (API upload + serveur statique)
hooks/
  usePhotos.ts                   # Hook React pour fetch/upload/delete photos
components/
  MarioEarth.tsx                 # Globe, donnees villes, composants monuments
  DestinationChoiceUI.tsx        # UI d'atterrissage : photos, carte de proposition
  StarryBackground.tsx           # Champ d'etoiles de fond
  LoginPage.tsx                  # Page de connexion
types.ts                         # Interfaces TypeScript (City, GalaxyConfig)
public/
  photos/                        # Photos statiques (hardcodees)
data/                            # Cree automatiquement au 1er lancement
  photos.json                   # Index des photos uploadees par ville
  photos/                       # Photos uploadees, organisees par ville
```

## 🗺 Destinations

| Ville | Pays | Monument | Statut |
|-------|------|----------|--------|
| Paris | France | Tour Eiffel | Souvenir |
| Amsterdam | Pays-Bas | Moulin à vent | Souvenir |
| Athènes | Grèce | Parthénon | Souvenir |
| Londres | Royaume-Uni | Big Ben | Proposition |
| Le Caire | Égypte | Pyramide de Gizeh | Proposition |
| Rome | Italie | — | Proposition |
| Helsinki | Finlande | — | Proposition |
| Zagreb | Croatie | — | Proposition |
| Madrid | Espagne | — | Proposition |

## 🏁 Developpement local

Ouvrir **2 terminaux** :

```bash
# Terminal 1 - Frontend (Vite, port 3000)
npm install
npm run dev

# Terminal 2 - Backend (Express, port 3001)
npm run dev:server
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.
Le proxy Vite redirige automatiquement `/api` et `/uploads` vers le backend.

## 📦 Build

```bash
npm run build
```

## 🍓 Deploiement sur Raspberry Pi

### Prerequis

Node.js >= 18 sur le Pi. Pour l'installer :

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

### 1. Builder le frontend (sur ta machine de dev)

```bash
npm run build
```

### 2. Transferer le projet sur le Pi

```bash
rsync -avz --exclude node_modules --exclude .git \
  ./ pi@<IP_DU_PI>:/home/pi/super-galaxy-earth/
```

### 3. Installer les dependances sur le Pi

```bash
ssh pi@<IP_DU_PI>
cd /home/pi/super-galaxy-earth
npm install --production
```

### 4. Lancer le serveur

```bash
node server.js
```

L'app est accessible sur `http://<IP_DU_PI>:3000` depuis n'importe quel appareil sur le meme reseau.

Pour changer le port : `PORT=8080 node server.js`

### 5. (Optionnel) Demarrage automatique avec systemd

```bash
sudo nano /etc/systemd/system/galaxy-earth.service
```

```ini
[Unit]
Description=Super Galaxy Earth
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/super-galaxy-earth
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable galaxy-earth
sudo systemctl start galaxy-earth
```

Commandes utiles :

```bash
sudo systemctl status galaxy-earth    # Statut
sudo systemctl restart galaxy-earth   # Redemarrer
sudo journalctl -u galaxy-earth -f    # Logs en temps reel
```

## 📡 API

| Methode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/photos/:cityName` | Liste les photos uploadees d'une ville |
| `POST` | `/api/photos/:cityName` | Upload (champ `photos`, max 5 fichiers, 10MB/fichier) |
| `DELETE` | `/api/photos/:cityName/:filename` | Supprime une photo |

## 📦 Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Frontend Vite (dev, port 3000) |
| `npm run dev:server` | Backend Express (dev, port 3001) |
| `npm run build` | Build frontend dans `dist/` |
| `npm start` | Production : frontend + backend sur port 3000 |
