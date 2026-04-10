import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const displayContent = document.getElementById("displayContent");
const heartsContainer = document.getElementById("heartsContainer");
const languagesContainer = document.getElementById("languagesContainer");

let handLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;
let currentLanguage = "es";
let isPurpleEffectActive = false;
let isTvEffectActive = false;

// Configuración de corazones con efectos
const hearts = [
  { emoji: "❤️", color: "#FF6B6B", effect: "wiggle" },
  { emoji: "💚", color: "#51CF66", effect: "glitch" },
  { emoji: "💛", color: "#FFD93D", effect: "wiggle" },
  { emoji: "💜", color: "#A569BD", effect: "glitch" },
  { emoji: "💙", color: "#4ECDC4", effect: "wiggle" },
  { emoji: "🧡", color: "#FF9F43", effect: "glitch" }
];

// Configuración de idiomas
const languages = [
  { code: "es", flag: "🇪🇸", name: "Spanish" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "fr", flag: "🇫🇷", name: "French" },
  { code: "ja", flag: "🇯🇵", name: "Japanese" }
];

let heartElements = [];

// Cargar imagen personalizada para el dedo índice
const customFingerImage = new Image();
customFingerImage.src = './assets/Cursor_Key.png'; // Cambia el nombre si es diferente

// Botones interactivos - AQUÍ DEFINES TUS BOTONES
const interactiveButtons = [
  {
    x: 50,
    y: 100,
    width: 150,
    height: 150,
    text: "Botón 1",
    color: "#FF6B6B",
    link: "https://64.media.tumblr.com/6189061e94a7467352a4e2d93b150851/1a6cf5d7e1b8b0ba-99/s2048x3072/dac3d55b8a8ea3913cbdedb8c18a76cffce9ce0e.gif",
    image: "./assets/boton1.png"
  },
  {
    x: 250,
    y: 100,
    width: 150,
    height: 150,
    text: "Botón 2",
    color: "#4ECDC4",
    link: "https://ejemplo2.com",
    image: "./assets/boton2.png"
  },
  {
    x: 450,
    y: 100,
    width: 150,
    height: 150,
    text: "Botón 3",
    color: "#95E1D3",
    link: "https://youtu.be/3XFXPIMdj2Y",
    image: "./assets/boton3.png"
  }
];

let lastClickTime = 0;

// Precargar imágenes de los botones
const buttonImages = {};
interactiveButtons.forEach(btn => {
  if (btn.image) {
    const img = new Image();
    img.src = btn.image;
    buttonImages[btn.image] = img;
  }
});

// Definir HAND_CONNECTIONS
const HAND_CONNECTIONS = [
  {start: 0, end: 1}, {start: 1, end: 2}, {start: 2, end: 3}, {start: 3, end: 4},
  {start: 0, end: 5}, {start: 5, end: 6}, {start: 6, end: 7}, {start: 7, end: 8},
  {start: 5, end: 9}, {start: 9, end: 10}, {start: 10, end: 11}, {start: 11, end: 12},
  {start: 9, end: 13}, {start: 13, end: 14}, {start: 14, end: 15}, {start: 15, end: 16},
  {start: 13, end: 17}, {start: 0, end: 17}, {start: 17, end: 18}, {start: 18, end: 19}, {start: 19, end: 20}
];

// Función para dibujar los botones interactivos
function drawButtons(ctx, videoWidth, videoHeight) {
  interactiveButtons.forEach(btn => {
    // Adaptar tamaño según resolución del video
    const scaledBtn = {
      x: (btn.x / 640) * videoWidth,
      y: (btn.y / 480) * videoHeight,
      width: (btn.width / 640) * videoWidth,
      height: (btn.height / 480) * videoHeight
    };

    // Dibujar imagen precargada
    if (btn.image && buttonImages[btn.image]) {
      ctx.drawImage(buttonImages[btn.image], scaledBtn.x, scaledBtn.y, scaledBtn.width, scaledBtn.height);
    }

  });
}

// Función para detectar si el dedo índice está tocando un botón
function checkButtonCollision(landmarks, videoWidth, videoHeight) {
  // Punto 8 es la punta del dedo índice
  const indexFingerTip = landmarks[8];

  if (!indexFingerTip) return;

  // Convertir coordenadas normalizadas a píxeles
  const fingerX = indexFingerTip.x * videoWidth;
  const fingerY = indexFingerTip.y * videoHeight;

  // Coordenadas de pantalla (ajustadas por el modo espejo) para los elementos del DOM
  const screenX = (1 - indexFingerTip.x) * window.innerWidth;
  const screenY = indexFingerTip.y * window.innerHeight;

  interactiveButtons.forEach((btn, index) => {
    const scaledBtn = {
      x: (btn.x / 640) * videoWidth,
      y: (btn.y / 480) * videoHeight,
      width: (btn.width / 640) * videoWidth,
      height: (btn.height / 480) * videoHeight
    };

    // Verificar colisión
    if (
      fingerX > scaledBtn.x &&
      fingerX < scaledBtn.x + scaledBtn.width &&
      fingerY > scaledBtn.y &&
      fingerY < scaledBtn.y + scaledBtn.height
    ) {
      // Evitar clicks muy rápidos (debounce)
      const now = Date.now();
      if (now - lastClickTime > 1000) {
        lastClickTime = now;
        console.log(`Botón ${index + 1} activado: ${btn.text}`);
        
        // Mostrar contenido en pantalla
        if (btn.link) {
          displayButtonContent(btn.link);
        }
        
        // Feedback visual
        showClickFeedback(scaledBtn);
      }
    }
  });

  // Detectar colisión con los corazones del banner HTML
  heartElements.forEach((heartEl, index) => {
    const rect = heartEl.getBoundingClientRect();
    // Usamos un pequeño margen (+/- 15px) para que el área táctil sea más perdonable
    if (
      screenX > rect.left - 15 &&
      screenX < rect.right + 15 &&
      screenY > rect.top - 15 &&
      screenY < rect.bottom + 15
    ) {
      const now = Date.now();
      if (now - lastClickTime > 1000) {
        lastClickTime = now;
        heartEl.click(); // Disparamos el click real para ejecutar su animación y efecto
      }
    }
  });
}

// Función para mostrar el contenido (imagen/GIF) en pantalla
function displayButtonContent(url) {
  displayContent.innerHTML = '';
  
  // Verificar si es un enlace de YouTube para reproducir solo el audio
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    }

    if (videoId) {
      const iframe = document.createElement('iframe');
      // Autoplay activado, controles ocultos
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0`;
      iframe.allow = "autoplay";
      iframe.style.display = "none"; // Oculto para que solo se escuche el audio
      
      displayContent.appendChild(iframe);
      displayContent.style.display = 'block';
      return; // Terminamos aquí para que el audio siga reproduciéndose y no se oculte a los 5s
    }
  }

  // Determinar si es una imagen o GIF
  const ext = url.toLowerCase().split('.').pop();
  
  if (['gif', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    const img = document.createElement('img');
    img.src = url;
    img.onload = () => {
      displayContent.appendChild(img);
      displayContent.style.display = 'block';
    };
    img.onerror = () => {
      console.error('Error cargando imagen:', url);
    };
  }
  
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    displayContent.style.display = 'none';
  }, 5000);
}

// Mostrar feedback visual cuando se activa un botón
function showClickFeedback(btn) {
  const ctx = canvasElement.getContext("2d");
  
  // Dibujar un círculo de confirmación
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.7;
  
  const centerX = btn.x + btn.width / 2;
  const centerY = btn.y + btn.height / 2;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, btn.width / 2 + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

// Inicializar banner interactivo
function initializeBanner() {
  // Crear corazones
  hearts.forEach((heart, index) => {
    const heartEl = document.createElement('div');
    heartEl.className = `heart ${heart.effect}`;
    heartEl.textContent = heart.emoji;
    heartEl.style.animationDelay = `${index * 0.1}s`;
    heartEl.style.cursor = 'pointer';
    
    heartEl.addEventListener('click', () => {
      playHeartAnimation(heartEl, heart.effect);
      
      // Si se toca el primer corazón (índice 0), aplicar/quitar efecto de shader a la cámara
      if (index === 0) {
        isPurpleEffectActive = !isPurpleEffectActive;
        isTvEffectActive = false;
        video.classList.remove('tv-effect');
        
        // Añadimos una transición suave para que el cambio no sea brusco
        video.style.transition = "filter 0.5s ease";
        video.style.filter = isPurpleEffectActive 
          ? "sepia(100%) hue-rotate(250deg) saturate(200%) brightness(0.9)" 
          : "none";
      }
      
      // Si se toca el segundo corazón (índice 1), aplicar distorsión TV Glitch
      if (index === 1) {
        isTvEffectActive = !isTvEffectActive;
        isPurpleEffectActive = false; // Desactivar el morado si estaba puesto
        
        if (isTvEffectActive) {
          video.style.transition = "none"; // El ruido no debe tener transición suave
          // Aplicamos el SVG que creamos y lo hacemos blanco y negro con mucho contraste
          video.style.filter = "url(#tv-glitch) grayscale(80%) contrast(200%) brightness(1.2)";
          video.classList.add('tv-effect');
        } else {
          video.style.filter = "none";
          video.classList.remove('tv-effect');
        }
      }
    });
    
    heartsContainer.appendChild(heartEl);
    heartElements.push(heartEl);
  });
  
  // Crear botones de idiomas
  languages.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = `language-btn ${lang.code === currentLanguage ? 'active' : ''}`;
    btn.textContent = `${lang.flag} ${lang.name}`;
    
    btn.addEventListener('click', () => {
      setLanguage(lang.code);
    });
    
    languagesContainer.appendChild(btn);
  });
}

// Reproducir animación en corazón
function playHeartAnimation(element, effect) {
  element.style.animation = 'none';
  setTimeout(() => {
    element.style.animation = '';
    element.classList.remove('wiggle', 'glitch', 'reveal');
    void element.offsetWidth; // Trigger reflow
    element.classList.add(effect);
  }, 10);
}

// Cambiar idioma
function setLanguage(code) {
  currentLanguage = code;
  
  // Actualizar botones activos
  document.querySelectorAll('.language-btn').forEach((btn, index) => {
    if (languages[index].code === code) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  console.log(`Idioma cambiado a: ${code}`);
}

// Crear HandLandmarker
const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 2
  });
  console.log("HandLandmarker cargado correctamente");
  initializeBanner(); // Inicializar banner
  enableCam();
};

// Inicializar
createHandLandmarker();

// Enable the live webcam view and start detection
function enableCam() {
  if (!handLandmarker) {
    console.log("Wait! handLandmarker not loaded yet.");
    return;
  }

  webcamRunning = true;

  const constraints = { video: true };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  }).catch((error) => {
    console.error("Error al acceder a la cámara:", error);
  });
}

let lastVideoTime = -1;
let results = undefined;

// Función para dibujar landmarks personalizados (con PNG en el dedo índice)
function drawCustomLandmarks(ctx, landmarks) {
  // Índices importantes:
  // 8 = punta del dedo índice
  
  landmarks.forEach((landmark, index) => {
    // Convertir coordenadas normalizadas a píxeles
    const x = landmark.x * canvasElement.width;
    const y = landmark.y * canvasElement.height;
    
    // Solo dibujar el cursor en el dedo índice (punto 8)
    if (index === 8 && customFingerImage.complete) {
      const size = 30; // Tamaño de la imagen
      ctx.drawImage(customFingerImage, x - size / 2, y - size / 2, size, size);
    }
    // No dibujar los otros landmarks - solo el cursor
  });
}

async function predictWebcam() {
  canvasElement.style.width = video.videoWidth;
  canvasElement.style.height = video.videoHeight;
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;
  
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, startTimeMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 5
      });
      
      // Dibujar landmarks normales pero reemplazar el dedo índice por custom PNG
      drawCustomLandmarks(canvasCtx, landmarks);
      
      // Detectar colisiones con botones
      checkButtonCollision(landmarks, canvasElement.width, canvasElement.height);
    }
  }

  // Dibujar botones interactivos
  drawButtons(canvasCtx, canvasElement.width, canvasElement.height);

  canvasCtx.restore();

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}
