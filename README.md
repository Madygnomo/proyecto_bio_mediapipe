# Proyecto Bio MediaPipe - Hand Tracking Interactive

Un proyecto interactivo que utiliza **MediaPipe** para detectar manos en tiempo real a través de la webcam. Incluye botones interactivos, efectos visuales y un banner personalizable.

## 🎯 Características

- ✋ **Detección de manos en tiempo real** - Tracking de 21 puntos de referencia por mano
- 🎨 **Banner interactivo** - Corazones con efectos (wiggle, glitch) y botones de idioma
- 🔘 **Botones interactivos** - Imágenes personalizadas que se activan al acercarse el dedo índice
- 🎬 **Reproducción de GIFs/Videos** - Muestra contenido multimedia al activar botones
- 🎯 **Cursor personalizado** - Reemplaza los puntos de detección con un PNG personalizado
- 🎭 **Efectos visuales** - Animaciones y feedback visual en tiempo real

## 📦 Requisitos

- Node.js (para servir los archivos)
- Navegador moderno con soporte para:
  - MediaPipe Tasks Vision
  - WebGL
  - getUserMedia (acceso a cámara)

## 🚀 Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/[tu-usuario]/proyecto_bio_mediapipe.git
cd proyecto_bio_mediapipe
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Ejecutar servidor local**
```bash
npm run dev
```

4. **Abrir en navegador**
Accede a `http://localhost:8000`

## 📁 Estructura del Proyecto

```
proyecto_bio_mediapipe/
├── index.html              # Archivo HTML principal
├── styles.css              # Estilos CSS
├── script.js               # Lógica principal (ES6 modules)
├── package.json            # Dependencias del proyecto
├── .gitignore              # Archivos a ignorar en Git
├── assets/                 # Carpeta de recursos
│   ├── boton1.png         # Imagen botón 1
│   ├── boton2.png         # Imagen botón 2
│   ├── boton3.png         # Imagen botón 3
│   └── Cursor_Key.png     # Cursor personalizado
└── node_modules/          # Dependencias instaladas
```

## ⚙️ Configuración

### Personalizar Botones

En `script.js`, busca `interactiveButtons` y edita:

```javascript
const interactiveButtons = [
  {
    x: 50,                    // Posición X
    y: 100,                   // Posición Y
    width: 150,               // Ancho
    height: 150,              // Alto
    text: "Botón 1",
    link: "https://ejemplo.com/gif.gif",  // URL a mostrar
    image: "./assets/boton1.png"          // Imagen del botón
  }
  // Agregar más botones...
];
```

### Cambiar Cursor Personalizado

Modifica esta línea en `script.js`:
```javascript
customFingerImage.src = './assets/Cursor_Key.png';
```

### Agregar Idiomas

Edita la configuración de idiomas en `script.js`:
```javascript
const languages = [
  { code: "es", flag: "🇪🇸", name: "Spanish" },
  // Agregar más idiomas...
];
```

## 🎮 Cómo Usar

1. **Permite el acceso a la cámara** cuando se solicite
2. **Levanta tu mano** frente a la cámara
3. **Acerca tu dedo índice** a los botones interactivos
4. **Haz clic en los corazones** del banner para activar efectos
5. **Cambia el idioma** con los botones en el banner

## 📚 Tecnologías Utilizadas

- **MediaPipe Tasks Vision** - Detección de manos
- **Canvas API** - Renderización en tiempo real
- **JavaScript ES6 Modules** - Modularidad del código
- **CSS3 Animations** - Efectos visuales

## 🔧 Dependencias

```json
{
  "@mediapipe/tasks-genai": "^0.10.27",
  "@mediapipe/tasks-vision": "^0.10.0"
}
```

## 📝 Licencia

Este proyecto está bajo licencia MIT. Ver archivo LICENSE para más detalles.

## 👤 Autor

Camilo Adams - [LinkedIn](https://linkedin.com) - [GitHub](https://github.com/camiloadams)

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o sugerencias, contáctame en [camiloadams@madygnome.com.co]

---

**¡Disfruta creando con MediaPipe! 🚀**
