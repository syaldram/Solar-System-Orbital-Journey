import * as THREE from 'three';

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return canvasTexture(canvas);
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,248,220,1)');
  gradient.addColorStop(0.14, 'rgba(255,193,91,.9)');
  gradient.addColorStop(0.48, 'rgba(255,118,28,.2)');
  gradient.addColorStop(1, 'rgba(255,105,22,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return canvasTexture(canvas);
}

export function createUranusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return canvasTexture(canvas);
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#c3eeee');
  gradient.addColorStop(0.42, '#82d2d8');
  gradient.addColorStop(0.58, '#76c6cf');
  gradient.addColorStop(1, '#a7e2df');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 0.1;
  for (let y = 20; y < canvas.height; y += 18) {
    context.fillStyle = y % 36 === 0 ? '#e4f8f3' : '#4eabb5';
    context.fillRect(0, y, canvas.width, 1.5);
  }
  return canvasTexture(canvas);
}

export function createEarthCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return canvasTexture(canvas);
  const random = seededRandom(20_020_701);
  context.filter = 'blur(5px)';
  for (let index = 0; index < 720; index += 1) {
    const latitude = (random() - 0.5) * Math.PI;
    const x = random() * canvas.width;
    const y = canvas.height * (0.5 - latitude / Math.PI);
    const width = 8 + random() * 42;
    const height = (2.5 + random() * 8) * Math.max(0.3, Math.cos(latitude));
    context.fillStyle = `rgba(255,255,255,${0.025 + random() * 0.1})`;
    context.beginPath();
    context.ellipse(x, y, width, height, (random() - 0.5) * 0.35, 0, Math.PI * 2);
    context.fill();
  }
  context.filter = 'none';
  return canvasTexture(canvas);
}

export function createRingTexture(kind: 'saturn' | 'uranus'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return canvasTexture(canvas);
  const center = canvas.width / 2;
  const random = seededRandom(kind === 'saturn' ? 16_101_979 : 24_011_986);
  context.translate(center, center);

  if (kind === 'saturn') {
    for (let index = 0; index < 150; index += 1) {
      const radius = 128 + index * 0.78;
      const gap = index > 74 && index < 84;
      const alpha = gap ? 0.015 : 0.08 + random() * 0.2;
      const warmth = Math.floor(190 + random() * 45);
      context.strokeStyle = `rgba(${warmth + 10},${warmth},${warmth - 28},${alpha})`;
      context.lineWidth = 0.7 + random() * 1.4;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
    }
  } else {
    const radii = [150, 164, 174, 187, 201, 216, 225];
    for (const radius of radii) {
      context.strokeStyle = `rgba(128,178,188,${0.12 + random() * 0.16})`;
      context.lineWidth = radius === 225 ? 2.2 : 0.9;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
    }
  }

  return canvasTexture(canvas);
}

function drawSpiral(
  context: CanvasRenderingContext2D,
  arm: number,
  armCount: number,
  color: string,
  width: number,
  offset = 0,
): void {
  const center = 256;
  context.beginPath();
  for (let step = 0; step <= 160; step += 1) {
    const progress = step / 160;
    const radius = 14 + progress * 215;
    const angle = (arm / armCount) * Math.PI * 2 + progress * Math.PI * 2.3 + offset;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius * 0.92;
    if (step === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.stroke();
}

export function createGalaxyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return canvasTexture(canvas);

  context.globalCompositeOperation = 'lighter';
  context.filter = 'blur(9px)';
  for (let arm = 0; arm < 2; arm += 1) {
    drawSpiral(context, arm, 2, 'rgba(92,145,210,.12)', 44);
    drawSpiral(context, arm, 2, 'rgba(185,209,238,.13)', 21, 0.025);
  }
  for (let arm = 0; arm < 4; arm += 1) {
    drawSpiral(context, arm, 4, 'rgba(105,117,180,.06)', 27, 0.16);
  }

  context.save();
  context.translate(256, 256);
  context.rotate(-0.28);
  const bar = context.createRadialGradient(0, 0, 5, 0, 0, 90);
  bar.addColorStop(0, 'rgba(255,237,190,.9)');
  bar.addColorStop(0.28, 'rgba(245,187,112,.48)');
  bar.addColorStop(1, 'rgba(162,92,64,0)');
  context.scale(1.8, 0.48);
  context.fillStyle = bar;
  context.beginPath();
  context.arc(0, 0, 90, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.globalCompositeOperation = 'source-over';
  context.filter = 'blur(5px)';
  for (let arm = 0; arm < 2; arm += 1) {
    drawSpiral(context, arm, 2, 'rgba(3,5,12,.42)', 9, 0.105);
  }

  const random = seededRandom(24_206_052);
  context.filter = 'none';
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < 2_200; index += 1) {
    const arm = index % 4;
    const radius = Math.pow(random(), 0.62) * 220;
    const angle = (arm / 4) * Math.PI * 2 + (radius / 220) * Math.PI * 2.3 + (random() - 0.5) * 0.42;
    const x = 256 + Math.cos(angle) * radius;
    const y = 256 + Math.sin(angle) * radius * 0.92;
    const core = 1 - radius / 220;
    const red = Math.round(150 + core * 100);
    const green = Math.round(175 + core * 60);
    const blue = Math.round(220 - core * 25);
    context.fillStyle = `rgba(${red},${green},${blue},${0.025 + random() * 0.12})`;
    const size = 0.5 + random() * 1.4;
    context.fillRect(x, y, size, size);
  }

  context.filter = 'none';
  return canvasTexture(canvas);
}

export function createAtmosphereMaterial(color: number, opacity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      glowOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float glowOpacity;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        float rim = pow(1.0 - abs(dot(vNormal, vViewDirection)), 2.4);
        gl_FragColor = vec4(glowColor, rim * glowOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function createSunMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;

      float hash(vec2 point) {
        return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 point) {
        vec2 cell = floor(point);
        vec2 fraction = fract(point);
        fraction = fraction * fraction * (3.0 - 2.0 * fraction);
        float a = hash(cell);
        float b = hash(cell + vec2(1.0, 0.0));
        float c = hash(cell + vec2(0.0, 1.0));
        float d = hash(cell + vec2(1.0, 1.0));
        return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
      }

      float fbm(vec2 point) {
        float value = 0.0;
        float amplitude = 0.55;
        for (int octave = 0; octave < 4; octave++) {
          value += amplitude * noise(point);
          point = point * 2.03 + 13.7;
          amplitude *= 0.48;
        }
        return value;
      }

      void main() {
        vec2 flow = vec2(time * 0.7, -time * 0.34);
        float cells = fbm(vUv * vec2(52.0, 26.0) + flow);
        float broad = fbm(vUv * vec2(8.0, 4.0) - flow * 0.25);
        float limb = 0.62 + 0.38 * max(0.0, vNormal.z);
        vec3 darkGold = vec3(1.0, 0.31, 0.025);
        vec3 paleGold = vec3(1.0, 0.86, 0.35);
        vec3 color = mix(darkGold, paleGold, smoothstep(0.25, 0.88, cells * 0.8 + broad * 0.35));
        gl_FragColor = vec4(color * limb, 1.0);
      }
    `,
  });
}
