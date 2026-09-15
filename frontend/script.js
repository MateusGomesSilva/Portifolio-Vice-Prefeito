document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  // Lenis: smooth scroll premium
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Mobile menu
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  menuToggle?.addEventListener('click', () => navMenu.classList.toggle('active'));
  navMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navMenu.classList.remove('active')));

  // Scroll-driven video frames on canvas
  const canvas = document.getElementById('heroCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const TOTAL_FRAMES = 180;
    const FRAME_SPEED = 2.0;
    const IMAGE_SCALE = 1.0; // 100% cover to stretch to the right edge completely
    const images = [];
    let loaded = 0;
    let currentFrame = 0;
    let averageBg = '#173b57';

    function framePath(i) {
      return `assets/frames/frame-${String(i + 1).padStart(3, '0')}.webp`;
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(currentFrame);
    }

    function drawFrame(index) {
      const img = images[index];
      if (!img || !img.complete) return;
      const cw = window.innerWidth, ch = window.innerHeight;
      const iw = img.naturalWidth || 1280, ih = img.naturalHeight || 720;
      ctx.fillStyle = averageBg;
      ctx.fillRect(0, 0, cw, ch);
      const cover = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
      const w = iw * cover, h = ih * cover;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }

    function sampleBackground(img) {
      try {
        const probe = document.createElement('canvas');
        probe.width = probe.height = 12;
        const pctx = probe.getContext('2d', { willReadFrequently: true });
        pctx.drawImage(img, 0, 0, 12, 12);
        const data = pctx.getImageData(0, 0, 12, 12).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
        averageBg = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
      } catch (e) { }
    }

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(i);
      img.onload = () => {
        loaded++;
        if (i === 0) {
          sampleBackground(img);
          drawFrame(0);
        }
        if (loaded === TOTAL_FRAMES) ScrollTrigger.refresh();
      };
      images.push(img);
    }
    resizeCanvas();
    window.addEventListener('resize', () => gsap.delayedCall(0.15, resizeCanvas));

    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.hero-scroll',
        start: 'top top',
        end: 'bottom bottom',
        scrub: FRAME_SPEED,
        invalidateOnRefresh: true
      }
    });
    heroTl.to('.hero-media', { clipPath: 'circle(100% at 50% 50%)', ease: 'none' }, 0);
    heroTl.to('.hero-copy', { xPercent: -8, yPercent: -7, opacity: 0.18, ease: 'none' }, 0.05);
    heroTl.to('.hero-meta', { x: 35, opacity: 0, ease: 'none' }, 0.05);
    heroTl.to('.hero-shade', { opacity: 0.48, ease: 'none' }, 0.15);

    ScrollTrigger.create({
      trigger: '.hero-scroll',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: self => {
        const index = Math.min(TOTAL_FRAMES - 1, Math.floor(self.progress * (TOTAL_FRAMES - 1)));
        if (index !== currentFrame) {
          currentFrame = index;
          drawFrame(index);
        }
      }
    });
  }

  // Animated stat counters
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count);
    const obj = { value: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          value: target,
          duration: 1.7,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = `+${Math.round(obj.value)}${target === 10 ? ' mil' : ''}`;
          }
        });
      }
    });
  });

  // Header & back-to-top button state
  const header = document.getElementById('header');
  const topBtn = document.getElementById('scrollTopBtn');
  ScrollTrigger.create({
    start: 80,
    onUpdate: self => {
      header?.classList.toggle('scrolled', self.scroll() > 80);
      topBtn?.classList.toggle('show', self.scroll() > 600);
    }
  });

  topBtn?.addEventListener('click', () => lenis.scrollTo(0, { duration: 1.1 }));

  // Atuação Carousel (Continuous Marquee Auto-Scroll)
  const atuacaoCarousel = document.getElementById('atuacaoCarousel');
  const atuacaoTrack = document.getElementById('atuacaoTrack');

  if (atuacaoCarousel && atuacaoTrack) {
    const originalGroup = atuacaoTrack.querySelector('.atuacao-group');
    if (originalGroup) {
      // Clone group to ensure continuous infinite loop across all screen resolutions
      const cloneCount = 3;
      for (let i = 0; i < cloneCount; i++) {
        const clone = originalGroup.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        atuacaoTrack.appendChild(clone);
      }

      let x = 0;
      const speed = 0.8; // Smooth auto-scroll speed (pixels per frame)
      let isHovered = false;
      let isDragging = false;
      let startX = 0;
      let currentX = 0;

      function getGroupStep() {
        const gap = parseFloat(window.getComputedStyle(atuacaoTrack).gap) || 28;
        return originalGroup.offsetWidth + gap;
      }

      function getClientX(e) {
        if (e.clientX !== undefined) return e.clientX;
        if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
        if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
        return 0;
      }

      // Sync continuous scrolling loop with GSAP ticker
      gsap.ticker.add(() => {
        if (!isDragging) {
          if (!isHovered) {
            x -= speed;
          }
          const step = getGroupStep();
          if (step > 0) {
            while (x <= -step) {
              x += step;
            }
            while (x > 0) {
              x -= step;
            }
          }
          gsap.set(atuacaoTrack, { x: x });
        }
      });

      // Hover controls: pause on hover for easy reading
      atuacaoCarousel.addEventListener('mouseenter', () => { isHovered = true; });
      atuacaoCarousel.addEventListener('mouseleave', () => {
        isHovered = false;
        if (isDragging) {
          isDragging = false;
          atuacaoCarousel.classList.remove('is-dragging');
        }
      });

      // Pointer/Touch dragging support
      const onPointerDown = (e) => {
        isDragging = true;
        startX = getClientX(e);
        currentX = x;
        atuacaoCarousel.classList.add('is-dragging');
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const pageX = getClientX(e);
        const dragDelta = pageX - startX;
        x = currentX + dragDelta;
        const step = getGroupStep();
        if (step > 0) {
          while (x <= -step) {
            x += step;
            startX += step;
          }
          while (x > 0) {
            x -= step;
            startX -= step;
          }
        }
        gsap.set(atuacaoTrack, { x: x });
      };

      const onPointerUp = () => {
        if (isDragging) {
          isDragging = false;
          atuacaoCarousel.classList.remove('is-dragging');
        }
      };

      atuacaoCarousel.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      atuacaoCarousel.addEventListener('touchstart', onPointerDown, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);
    }
  }
});

