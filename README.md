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


