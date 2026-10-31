/**
 * Revio 3D Interactive WebGL & Canvas Engine
 * Cinematic Editorial Utility - ThreeUI & Spline Inspired
 * 
 * Provides:
 * 1. Procedural Interactive WebGL 3D Refractive Glass Sculpture for Hero
 * 2. 3D Parallax & Perspective Tilt for Floating Review Cards
 * 3. Procedural Holographic Energy Orb with Particle Stream for Screen 03 (Processing)
 * 
 * Zero external dependencies. High performance 60 FPS GPU-accelerated graphics.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. HERO PROCEDURAL 3D GLASS SCULPTURE (WebGL Fragment Shader)
  // ---------------------------------------------------------------------------

  const HERO_VS = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Raymarched & refracted multi-layered glass sculpture with internal swirling
  // violet/amber fluid core, concentric orbital lenses, chromatic dispersion and Fresnel rim.
  const HERO_FS = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform vec2 u_drag;
    uniform float u_hover;
    uniform float u_sentiment;

    mat2 rot2D(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
      vec2 p_uv = uv * 1.35;

      float mouseX = (u_mouse.x - 0.5) * 1.1 + u_drag.x;
      float mouseY = (u_mouse.y - 0.5) * 0.8 + u_drag.y;
      float idleTime = u_time * 0.22;

      vec3 ro = vec3(0.0, 0.0, 2.9);
      vec3 rd = normalize(vec3(p_uv, -1.8));

      rd.yz *= rot2D(-mouseY * 0.45 + sin(idleTime * 0.6) * 0.03);
      rd.xz *= rot2D(mouseX * 0.55 + cos(idleTime * 0.5) * 0.04);
      ro.yz *= rot2D(-mouseY * 0.45 + sin(idleTime * 0.6) * 0.03);
      ro.xz *= rot2D(mouseX * 0.55 + cos(idleTime * 0.5) * 0.04);

      // Colors: Translucent glass, champagne-metal orbital rings, dark mineral core, restrained violet
      vec3 colViolet     = vec3(0.55, 0.28, 0.94);
      vec3 colChampagne  = vec3(0.96, 0.86, 0.62);
      vec3 colMineral    = vec3(0.05, 0.04, 0.08);
      vec3 colAmethyst   = vec3(0.24, 0.10, 0.38);

      vec3 activePrimary   = colViolet;
      vec3 activeSecondary = colChampagne;

      // Restrained subtle response (no red energy-ball)
      if (u_sentiment < -0.05) {
        float negF = clamp(-u_sentiment, 0.0, 1.0) * 0.15; // gentle, restrained tint
        activePrimary = mix(colViolet, vec3(0.68, 0.22, 0.45), negF);
      } else if (u_sentiment > 0.05) {
        float posF = clamp(u_sentiment, 0.0, 1.0) * 0.20;
        activePrimary = mix(colViolet, vec3(0.35, 0.55, 0.95), posF);
      }

      // Background ambient glow (deep, restrained, subtle bloom)
      float bgDist = length(p_uv);
      vec3 bgGlow = mix(vec3(0.035, 0.015, 0.06), vec3(0.008, 0.006, 0.014), smoothstep(0.0, 0.95, bgDist));
      bgGlow += activePrimary * pow(max(0.0, 1.0 - bgDist * 1.3), 3.0) * 0.16;
      
      // Floating champagne stardust
      float dust1 = sin(p_uv.x * 24.0 + u_time * 0.5) * cos(p_uv.y * 22.0 - u_time * 0.4);
      if (dust1 > 0.988) {
        bgGlow += colChampagne * (dust1 - 0.988) * 16.0 * smoothstep(1.0, 0.4, bgDist);
      }

      // Key light directions
      vec3 light1 = normalize(vec3(1.2, 1.8, 2.0));
      vec3 light2 = normalize(vec3(-1.4, -0.9, 1.2));

      // 1. Raymarch outer orbital ring & floating golden pearls
      float tOrbit = -1.0;
      vec3 orbitCol = vec3(0.0);
      float tM = 1.0;
      for (int i = 0; i < 24; i++) {
        vec3 pos = ro + rd * tM;
        
        // Tilted orbital ring
        vec3 pRing = pos;
        pRing.yz *= rot2D(0.48);
        pRing.xz *= rot2D(-0.35 + idleTime * 0.1);
        float dRing = length(vec2(length(pRing.xz) - 0.88, pRing.y * 1.6)) - 0.018;

        // Floating golden pearls
        float a1 = idleTime * 0.4;
        vec3 posSph1 = vec3(cos(a1) * 0.82, 0.42 + sin(a1 * 1.5) * 0.1, sin(a1) * 0.82);
        float dSph1 = length(pos - posSph1) - 0.042;

        float a2 = idleTime * 0.35 + 2.1;
        vec3 posSph2 = vec3(cos(a2) * 0.92, -0.38 + cos(a2 * 1.3) * 0.1, sin(a2) * 0.92);
        float dSph2 = length(pos - posSph2) - 0.038;

        float dMin = min(dRing, min(dSph1, dSph2));
        if (dMin < 0.006) {
          tOrbit = tM;
          vec3 NOrb = normalize(pos);
          if (dRing < dMin + 0.002) {
            vec3 ringRad = normalize(vec3(pRing.x, 0.0, pRing.z));
            NOrb = normalize(pRing - ringRad * 0.88);
            NOrb.xz *= rot2D(0.35 - idleTime * 0.1);
            NOrb.yz *= rot2D(-0.48);
          } else if (dSph1 < dMin + 0.002) {
            NOrb = normalize(pos - posSph1);
          } else {
            NOrb = normalize(pos - posSph2);
          }
          vec3 goldBase = vec3(0.96, 0.86, 0.62);
          float specGold = pow(max(dot(NOrb, normalize(light1 - rd)), 0.0), 36.0) * 1.8;
          float diffGold = max(dot(NOrb, light1), 0.0) * 0.65 + 0.35;
          orbitCol = goldBase * diffGold + vec3(1.0, 0.98, 0.92) * specGold;
          break;
        }
        tM += max(dMin * 0.75, 0.04);
        if (tM > 3.6) break;
      }

      // 2. Glass Sphere Intersection
      float radius = 0.62;
      float b = dot(ro, rd);
      float c = dot(ro, ro) - radius * radius;
      float h = b * b - c;

      if (h < 0.0) {
        if (tOrbit > 0.0) {
          gl_FragColor = vec4(orbitCol, 1.0);
        } else {
          gl_FragColor = vec4(bgGlow, 0.0);
        }
        return;
      }

      float tSphere = -b - sqrt(h);
      vec3 hitPos = ro + rd * tSphere;
      vec3 N = normalize(hitPos);

      // Specular highlights
      vec3 halfVec1 = normalize(light1 - rd);
      vec3 halfVec2 = normalize(light2 - rd);
      float spec1 = pow(max(dot(N, halfVec1), 0.0), 160.0) * 1.2;
      float spec2 = pow(max(dot(N, halfVec2), 0.0), 220.0) * 0.6;
      vec3 specCol = vec3(1.0, 0.98, 1.0) * spec1 + activeSecondary * spec2 * 0.6;

      // Fresnel rim
      float fresnel = pow(1.0 - max(dot(-rd, N), 0.0), 3.2);
      float rim = pow(1.0 - max(dot(-rd, N), 0.0), 1.6);

      // Refract ray
      vec3 refrR = refract(rd, N, 1.0 / 1.48);
      vec3 refrG = refract(rd, N, 1.0 / 1.52);
      vec3 refrB = refract(rd, N, 1.0 / 1.56);
      if (length(refrR) < 0.01) refrR = reflect(rd, N);
      if (length(refrG) < 0.01) refrG = reflect(rd, N);
      if (length(refrB) < 0.01) refrB = reflect(rd, N);

      // Internal sampling
      vec3 internalColor = bgGlow * 0.35;
      float stepSize = 0.065;
      vec3 marchPosG = hitPos + refrG * 0.04;

      for (int i = 0; i < 16; i++) {
        marchPosG += refrG * stepSize;
        float rLen = length(marchPosG);
        if (rLen > radius) break;

        vec3 p = marchPosG;
        p.xz *= rot2D(u_time * 0.38 + p.y * 1.2);
        p.xy *= rot2D(0.42 + sin(u_time * 0.28) * 0.2);

        float dRing1 = length(vec2(length(p.xz) - 0.36, p.y * 1.9)) - 0.06;
        float dRing2 = length(vec2(length(p.xy) - 0.26, p.z * 1.6)) - 0.05;
        float wave = sin(p.x * 5.5 + u_time * 0.7) * cos(p.y * 5.5 - u_time * 0.5) * sin(p.z * 5.5 + u_time * 0.5);

        if (dRing1 < 0.05) {
          float dens = smoothstep(0.05, -0.04, dRing1);
          internalColor += colChampagne * dens * 0.22 * (1.0 + wave * 0.25);
          internalColor += colViolet * dens * 0.35 * (1.0 - wave * 0.2);
        }

        if (dRing2 < 0.05) {
          float dens = smoothstep(0.05, -0.04, dRing2);
          internalColor += colViolet * dens * 0.32 * (1.0 - wave * 0.25);
        }

        // Dark mineral core (deep obsidian/amethyst, no glowing red energy ball)
        float dCore = rLen - 0.28;
        if (dCore < 0.0) {
          float coreDens = smoothstep(0.0, -0.28, dCore);
          vec3 coreCol = mix(colMineral, colAmethyst, 0.5 + 0.5 * sin(p.x * 2.5 + u_time * 0.4));
          internalColor = mix(internalColor, coreCol, coreDens * 0.88);
        }

        if (wave > 0.65) {
          internalColor += colViolet * (wave - 0.65) * 0.35;
        }
      }

      vec3 rimCol = mix(colViolet * 0.95, colChampagne * 1.05, fresnel * 0.85);
      vec3 finalGlass = internalColor;
      finalGlass = mix(finalGlass, rimCol, fresnel * 0.70);
      finalGlass += specCol * (1.25 + 0.4 * u_hover);
      finalGlass += colViolet * rim * 0.40;

      float edgeAlpha = smoothstep(radius, radius - 0.015, length(hitPos.xy));

      // Composite foreground orbit elements if in front of sphere
      if (tOrbit > 0.0 && tOrbit < tSphere) {
        gl_FragColor = vec4(orbitCol, 1.0);
      } else {
        gl_FragColor = vec4(finalGlass, edgeAlpha);
      }
    }
  `;

  function initHero3D() {
    const container = document.getElementById('hero3dContainer');
    const canvas = document.getElementById('revioHeroCanvas');
    if (!container || !canvas) return;

    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    } catch (e) {
      console.warn('WebGL not supported for Hero 3D:', e);
      return;
    }
    if (!gl) return;

    // Helper: Compile Shader
    function compileShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    const vs = compileShader(gl.VERTEX_SHADER, HERO_VS);
    const fs = compileShader(gl.FRAGMENT_SHADER, HERO_FS);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uDrag = gl.getUniformLocation(program, 'u_drag');
    const uHover = gl.getUniformLocation(program, 'u_hover');
    const uSentiment = gl.getUniformLocation(program, 'u_sentiment');

    // State
    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };
    let drag = { x: 0.0, y: 0.0 };
    let dragVel = { x: 0.0, y: 0.0 };
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let hoverState = 0.0;
    let targetHover = 0.0;
    let sentimentVal = 0.0;
    let targetSentiment = 0.0;
    let startTime = performance.now();
    let isVisible = true;

    // Interactive Drag to Spin the 3D Glass Sculpture
    canvas.addEventListener('pointerdown', function (e) {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      targetHover = 2.0;
      canvas.style.cursor = 'grabbing';
      if (typeof window.playUiSound === 'function') window.playUiSound('click');
    });

    window.addEventListener('pointermove', function (e) {
      if (!isDragging) return;
      const dx = (e.clientX - dragStartX) * 0.01;
      const dy = (e.clientY - dragStartY) * 0.01;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragVel.x = dx;
      dragVel.y = dy;
      drag.x += dx;
      drag.y += dy;
    });

    window.addEventListener('pointerup', function () {
      if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'grab';
      }
    });

    // Expose dynamic sentiment morpher
    window.setHeroSentiment = function (val) {
      targetSentiment = Math.max(-1.0, Math.min(1.0, Number(val) || 0.0));
      targetHover = 2.2;
      setTimeout(() => { targetHover = 1.0; }, 450);
    };

    // Resize handler
    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(rect.width, 320);
      const height = Math.max(rect.height, 320);

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Mouse listener on entire hero visual card
    const heroCard = container.closest('.revio-hero-visual-card') || container;
    heroCard.addEventListener('pointermove', function (e) {
      const rect = heroCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      targetMouse.x = Math.max(0.0, Math.min(1.0, x));
      targetMouse.y = Math.max(0.0, Math.min(1.0, 1.0 - y)); // invert Y for WebGL
      targetHover = 1.0;
    }, { passive: true });

    heroCard.addEventListener('pointerleave', function () {
      targetMouse.x = 0.5;
      targetMouse.y = 0.5;
      targetHover = 0.0;
    }, { passive: true });

    // Click pulse
    heroCard.addEventListener('pointerdown', function () {
      targetHover = 2.0;
      setTimeout(() => { targetHover = 1.0; }, 240);
    });

    // Visibility observer to save CPU when offscreen
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(container);
    }

    // 3D Orbital Revolution for Floating Review Callout Bars around the Globe
    const calloutPos = container.querySelector('.revio-callout-pos');
    const calloutMixed = container.querySelector('.revio-callout-mixed');
    const calloutNeg = container.querySelector('.revio-callout-neg');
    const calloutCards = [calloutPos, calloutMixed, calloutNeg].filter(Boolean);

    let orbitAngle = -0.35; // initial reference alignment
    let orbitHoverFactor = 1.0;
    let targetOrbitHoverFactor = 1.0;
    let lastOrbitTime = performance.now();

    // Hover listener to pause/slow down orbit smoothly
    calloutCards.forEach(card => {
      card.addEventListener('pointerenter', () => {
        targetOrbitHoverFactor = 0.04; // slow to a near standstill when reading
      });
      card.addEventListener('pointerleave', () => {
        targetOrbitHoverFactor = 1.0;
      });
    });

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Render loop
    function render(timeNow) {
      requestAnimationFrame(render);
      if (!isVisible) return;

      // Smooth lerp
      mouse.x += (targetMouse.x - mouse.x) * 0.07;
      mouse.y += (targetMouse.y - mouse.y) * 0.07;
      hoverState += (targetHover - hoverState) * 0.1;
      sentimentVal += (targetSentiment - sentimentVal) * 0.08;

      if (!isDragging) {
        drag.x += dragVel.x;
        drag.y += dragVel.y;
        dragVel.x *= 0.94;
        dragVel.y *= 0.94;
      }

      const elapsed = prefersReducedMotion ? 1.5 : (timeNow - startTime) * 0.001;

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform2f(uDrag, drag.x, drag.y);
      gl.uniform1f(uHover, hoverState);
      gl.uniform1f(uSentiment, sentimentVal);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // 3D Orbital revolution of review bars around the central globe
      if (calloutCards.length >= 3 && !prefersReducedMotion) {
        const dt = Math.min(0.06, (timeNow - lastOrbitTime) * 0.001);
        lastOrbitTime = timeNow;

        orbitHoverFactor += (targetOrbitHoverFactor - orbitHoverFactor) * 0.12;
        // Base orbit speed: ~22s per full 360 revolution + drag rotation coupling
        orbitAngle += (0.28 * orbitHoverFactor * dt) + (dragVel.x * 0.75);

        const rect = container.getBoundingClientRect();
        // Compute responsive radii based on container size
        const rx = Math.min(200, Math.max(140, rect.width * 0.35));
        const ry = Math.min(100, Math.max(65, rect.height * 0.22));
        const tilt = -0.32; // -18.3 deg tilt matching champagne orbital ring
        const cosTilt = Math.cos(tilt);
        const sinTilt = Math.sin(tilt);

        // 3 cards spaced 120 deg (2*PI / 3) apart
        const angleOffsets = [0.0, (2.0 * Math.PI) / 3.0, (4.0 * Math.PI) / 3.0];

        calloutCards.forEach((card, idx) => {
          const a = orbitAngle + angleOffsets[idx];
          const cosA = Math.cos(a);
          const sinA = Math.sin(a);

          // Rotated ellipse coordinates
          const rawX = cosA * rx;
          const rawY = sinA * ry;
          const x = rawX * cosTilt - rawY * sinTilt;
          const y = rawX * sinTilt + rawY * cosTilt;

          // Depth Z in [-1, 1]: +1 is directly in front, -1 is behind the globe
          const z = sinA;

          // Scale: 1.04 in front, 0.86 behind
          const scale = 0.95 + z * 0.09;

          // Opacity: 1.0 in front, 0.52 behind
          const opacity = 0.76 + z * 0.24;

          // Layering: In front of WebGL canvas (z-index 25) when z > -0.05, behind canvas (z-index 0) when z <= -0.05
          const zIdx = z >= -0.05 ? 25 : 0;

          // Dynamic shadow blur based on depth
          const shadowBlur = Math.round(10 + (z + 1.0) * 8);
          const shadowAlpha = (0.16 + (z + 1.0) * 0.08).toFixed(2);

          card.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), ${(z * 35).toFixed(1)}px) scale(${scale.toFixed(3)})`;
          card.style.opacity = opacity.toFixed(2);
          card.style.zIndex = zIdx;
          card.style.boxShadow = `0 ${shadowBlur}px ${shadowBlur * 1.8}px rgba(0, 0, 0, ${shadowAlpha})`;
        });
      }
    }

    requestAnimationFrame(render);
  }


  // ---------------------------------------------------------------------------
  // 2. FLOATING REVIEW CARDS 3D PARALLAX & TILT INTERACTION
  // ---------------------------------------------------------------------------

  function initFloatingCardsParallax() {
    const heroVisual = document.querySelector('.revio-hero-visual-card');
    const card1 = document.querySelector('.revio-floating-card-1');
    const card2 = document.querySelector('.revio-floating-card-2');
    if (!heroVisual || !card1 || !card2) return;

    let targetX = 0, targetY = 0;
    let currX = 0, currY = 0;

    heroVisual.addEventListener('pointermove', function (e) {
      const rect = heroVisual.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;  // -1 to 1
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to 1
      targetX = normX;
      targetY = normY;
    }, { passive: true });

    heroVisual.addEventListener('pointerleave', function () {
      targetX = 0;
      targetY = 0;
    }, { passive: true });

    function updateCards() {
      currX += (targetX - currX) * 0.08;
      currY += (targetY - currY) * 0.08;

      // Card 1 (Top Left, Mixed): tilts with positive parallax
      const rotX1 = -currY * 12;
      const rotY1 = currX * 14;
      const transX1 = currX * 18;
      const transY1 = currY * 14;
      card1.style.transform = `perspective(1000px) translate3d(${transX1}px, ${transY1}px, 35px) rotateX(${rotX1}deg) rotateY(${rotY1}deg)`;

      // Card 2 (Bottom Right, Positive): counter-tilts with depth layer
      const rotX2 = -currY * 10;
      const rotY2 = currX * 12;
      const transX2 = -currX * 16;
      const transY2 = -currY * 12;
      card2.style.transform = `perspective(1000px) translate3d(${transX2}px, ${transY2}px, 45px) rotateX(${rotX2}deg) rotateY(${rotY2}deg)`;

      requestAnimationFrame(updateCards);
    }

    requestAnimationFrame(updateCards);
  }


  // ---------------------------------------------------------------------------
  // 3. SCREEN 03 (PROCESSING) PROCEDURAL 3D ENERGY ORB & PARTICLE STREAM
  // ---------------------------------------------------------------------------

  function initProcessingOrb() {
    const container = document.getElementById('processingOrbContainer');
    const canvas = document.getElementById('revioProcessingCanvas');
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate orbiting particles
    const PARTICLE_COUNT = 140;
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        radius: 70 + Math.random() * 110,
        angle: Math.random() * Math.PI * 2,
        speed: (0.012 + Math.random() * 0.022) * (Math.random() > 0.3 ? 1 : -1),
        yAmp: 18 + Math.random() * 35,
        yPhase: Math.random() * Math.PI * 2,
        size: 1.5 + Math.random() * 2.8,
        color: Math.random() > 0.4 ? 'rgba(167, 139, 250, ' : 'rgba(251, 191, 36, ',
        alpha: 0.3 + Math.random() * 0.6
      });
    }

    let isVisible = true;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(container);
    }

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(rect.width, 300);
      const h = Math.max(rect.height, 300);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    let angle1 = 0;
    let angle2 = 0;

    function renderOrb() {
      requestAnimationFrame(renderOrb);
      if (!isVisible) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;

      ctx.clearRect(0, 0, w, h);

      angle1 += 0.015;
      angle2 -= 0.022;

      // 1. Deep Core Ambient Glow
      const coreRadius = 78 * dpr;
      const coreGrad = ctx.createRadialGradient(cx, cy, 10 * dpr, cx, cy, coreRadius * 1.8);
      coreGrad.addColorStop(0, 'rgba(167, 139, 250, 0.45)');
      coreGrad.addColorStop(0.4, 'rgba(124, 58, 237, 0.28)');
      coreGrad.addColorStop(0.7, 'rgba(217, 119, 6, 0.15)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2. Pulsing Radial Progress Aura
      const pulse = 1.0 + Math.sin(angle1 * 3.0) * 0.04;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);

      // Inner glass orb body
      const glassGrad = ctx.createRadialGradient(-20 * dpr, -20 * dpr, 5 * dpr, 0, 0, coreRadius);
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      glassGrad.addColorStop(0.3, 'rgba(167, 139, 250, 0.25)');
      glassGrad.addColorStop(0.75, 'rgba(30, 27, 75, 0.65)');
      glassGrad.addColorStop(1, 'rgba(139, 92, 246, 0.4)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Sharp glass specular shine
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.8 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius - 1.5 * dpr, -Math.PI * 0.7, -Math.PI * 0.1);
      ctx.stroke();

      ctx.restore();

      // 3. 3D Holographic Orbiting Rings
      // Ring A: Violet tilted ellipse
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.35);
      ctx.scale(1.0, 0.42);
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.65)';
      ctx.lineWidth = 2.2 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, (coreRadius + 28 * dpr), angle1, angle1 + Math.PI * 1.4);
      ctx.stroke();
      ctx.restore();

      // Ring B: Amber/Gold tilted counter-orbit
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.48);
      ctx.scale(1.0, 0.35);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
      ctx.lineWidth = 1.8 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, (coreRadius + 36 * dpr), angle2, angle2 + Math.PI * 1.2);
      ctx.stroke();
      ctx.restore();

      // 4. Stream of Swirling Data Particles
      particles.forEach((p) => {
        p.angle += p.speed;
        const px = cx + Math.cos(p.angle) * (p.radius * dpr);
        const py = cy + Math.sin(p.angle) * (p.radius * 0.45 * dpr) + Math.sin(p.angle * 2.0 + p.yPhase) * (p.yAmp * dpr);

        ctx.fillStyle = p.color + (p.alpha * (0.6 + Math.sin(p.angle) * 0.4)) + ')';
        ctx.beginPath();
        ctx.arc(px, py, p.size * dpr, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    requestAnimationFrame(renderOrb);
  }


  // ---------------------------------------------------------------------------
  // 4. THREEUI GLOBAL SPOTLIGHT & 3D BENTO CARD PARALLAX TILT
  // ---------------------------------------------------------------------------

  function initThreeUiInteractions() {
    // Ambient spotlight following cursor
    window.addEventListener('pointermove', function (e) {
      const pctX = ((e.clientX / window.innerWidth) * 100).toFixed(1);
      const pctY = ((e.clientY / window.innerHeight) * 100).toFixed(1);
      document.documentElement.style.setProperty('--cursor-x', `${pctX}%`);
      document.documentElement.style.setProperty('--cursor-y', `${pctY}%`);
    }, { passive: true });

    // Bento Card Gyro Tilt
    const bentoCards = document.querySelectorAll('.revio-bento-card');
    bentoCards.forEach((card) => {
      card.addEventListener('pointermove', function (e) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const normX = (x / rect.width) * 2 - 1;
        const normY = (y / rect.height) * 2 - 1;
        card.style.setProperty('--card-x', `${x}px`);
        card.style.setProperty('--card-y', `${y}px`);
        card.style.transform = `perspective(800px) rotateX(${-normY * 7}deg) rotateY(${normX * 8}deg) translateY(-4px)`;
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      }, { passive: true });
    });
  }

  // ---------------------------------------------------------------------------
  // 5. GLOBAL INTERACTIVE AMBIENT PARTICLE & WAVE CANVAS
  // ---------------------------------------------------------------------------
  function initGlobalAmbientCanvas() {
    const canvas = document.getElementById('globalAmbientCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0;
    const PARTICLE_COUNT = 75;
    const particles = [];
    const ripples = [];
    let mouse = { x: -9999, y: -9999, active: false };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Spawn 3D drifting particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.3 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 1.2 + Math.random() * 2.2,
        baseAlpha: 0.18 + Math.random() * 0.35,
        color: Math.random() > 0.4 ? 'rgba(167, 139, 250, ' : 'rgba(139, 92, 246, '
      });
    }

    // Pointer tracking
    window.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      mouse.active = false;
    }, { passive: true });

    // Click wave ripples
    window.addEventListener('pointerdown', function (e) {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 5,
        maxRadius: 220,
        alpha: 0.55,
        speed: 5.0
      });
    }, { passive: true });

    function renderAmbient() {
      requestAnimationFrame(renderAmbient);
      ctx.clearRect(0, 0, width, height);

      // 1. Update and draw ripples
      for (let r = ripples.length - 1; r >= 0; r--) {
        const rip = ripples[r];
        rip.radius += rip.speed;
        rip.alpha *= 0.95;

        ctx.strokeStyle = `rgba(167, 139, 250, ${rip.alpha * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (rip.alpha < 0.01 || rip.radius > rip.maxRadius) {
          ripples.splice(r, 1);
        }
      }

      // 2. Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Drift
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;

        // Wrap edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse attraction with spring dampening
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const force = (1 - dist / 180) * 0.025 * p.z;
            p.x += dx * force;
            p.y += dy * force;
          }
        }

        // Draw particle
        ctx.fillStyle = p.color + p.baseAlpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
        ctx.fill();

        // Connect constellation lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 90) {
            const lineAlpha = (1 - dist2 / 90) * 0.12 * p.z * p2.z;
            ctx.strokeStyle = `rgba(167, 139, 250, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }

    requestAnimationFrame(renderAmbient);
  }

  // ---------------------------------------------------------------------------
  // 6. BOOTSTRAP WHEN DOM READY
  // ---------------------------------------------------------------------------

  function init() {
    initHero3D();
    initFloatingCardsParallax();
    initProcessingOrb();
    initThreeUiInteractions();
    initGlobalAmbientCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
