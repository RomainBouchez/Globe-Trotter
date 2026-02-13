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

## 📁 Structure du Projet

```
App.tsx                          # Scène principale : Canvas, caméra, éclairage, UI
components/
  MarioEarth.tsx                 # Globe, données villes, composants monuments
  DestinationChoiceUI.tsx        # UI d'atterrissage : photos, carte de proposition
  StarryBackground.tsx           # Champ d'étoiles de fond
  PhotoOverview.tsx              # Galerie photo
types.ts                         # Interfaces TypeScript (City, GalaxyConfig)
public/
  tour_eiffel.obj                # Modèle 3D Tour Eiffel
  Windmill.glb                   # Modèle 3D Moulin à vent
  My_Parthenon1000.glb           # Modèle 3D Parthénon
  clock_tower_big_ben.glb        # Modèle 3D Big Ben
  giza_pyramid_low-poly.glb      # Modèle 3D Pyramide de Gizeh
  photos/                        # Photos des destinations
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

## 🏁 Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173) dans le navigateur.

## 📦 Build

```bash
npm run build
npm run preview
```
