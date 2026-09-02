(function(){
  const body = document.body;
  const panel = document.getElementById('panel');
  const trigger = document.getElementById('trigger');
  const led = document.getElementById('led');
  const statusText = document.getElementById('statusText');
  const subtitleText = document.getElementById('subtitleText');
  const meter = document.getElementById('meter');
  const loadReading = document.getElementById('loadReading');
  const clockReading = document.getElementById('clockReading');
  const outageMark = document.getElementById('outageMark');
  const bwOverlay = document.getElementById('bwOverlay');

  const SUBTITLE_AFTER = 'CLICK TO CUT THE MAIN';

  const BAR_COUNT = 18;
  const bars = [];
  for (let i = 0; i < BAR_COUNT; i++){
    const b = document.createElement('div');
    b.className = 'bar live';
    meter.appendChild(b);
    bars.push(b);
  }

  // ---- load meter: GSAP re-evaluates a function-based value on every
  // repeat, so each bar keeps re-randomizing its own height forever ----
  let meterTween = null;
  let loadTextTimer = null;

  function startMeter(){
    meterTween = gsap.to(bars, {
      height: () => (6 + Math.random() * 28) + 'px',
      duration: 0.22,
      ease: 'steps(1)',
      repeat: -1,
      stagger: { each: 0.015, repeat: -1 }
    });
    loadTextTimer = setInterval(() => {
      loadReading.textContent = Math.round(30 + Math.random() * 55) + '%';
    }, 220);
  }

  function stopMeter(flatten){
    if (meterTween) meterTween.kill();
    clearInterval(loadTextTimer);
    if (flatten){
      gsap.set(bars, { height: '3px' });
      bars.forEach(b => b.classList.remove('live'));
      loadReading.textContent = '0%';
    }
  }
  startMeter();

  function tickClock(){
    const d = new Date();
    clockReading.textContent = d.toTimeString().slice(0, 8);
  }
  tickClock();
  setInterval(tickClock, 1000);

  let animating = false;
  let revealed = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealBreakerTheme(){
    if (revealed) return;
    revealed = true;
    body.classList.remove('theme-light');
    subtitleText.textContent = SUBTITLE_AFTER;

    // whole-page brightness stutter as the new theme lands, while
    // the panel is still hidden mid-blackout
    gsap.timeline()
      .to(body, { filter: 'brightness(2.4)', duration: 0.06 })
      .to(body, { filter: 'brightness(0.15)', duration: 0.09 })
      .to(body, { filter: 'brightness(1.9)', duration: 0.09 })
      .to(body, { filter: 'brightness(0.3)', duration: 0.09 })
      .to(body, { filter: 'brightness(1)', duration: 0.12, clearProps: 'filter' });
  }

  async function powerOff(){
    led.className = 'led trip';
    statusText.textContent = 'TRIPPING…';

    if (reduced){
      gsap.set(panel, { autoAlpha: 0 });
      panel.classList.add('hidden-content');
      stopMeter(true);
      led.className = 'led off';
      statusText.textContent = 'OFFLINE';
      await gsap.to({}, { duration: 0.15 });
      return;
    }

    // pre-trip chaos: the whole screen strobes black/white while the
    // panel jitters in brightness — random each time, not a fixed curve
    const flicker = gsap.timeline();
    for (let i = 0; i < 7; i++){
      flicker.to(bwOverlay, {
        opacity: () => (Math.random() < 0.5 ? 0 : gsap.utils.random(0.5, 0.95)),
        duration: 0.045
      });
      flicker.to(panel, {
        filter: () => `brightness(${gsap.utils.random(0.2, 2, 0.1)})`,
        duration: 0.045
      }, '<');
    }
    flicker.set(bwOverlay, { opacity: 0 });
    await flicker;

    stopMeter(true);
    led.className = 'led off';
    statusText.textContent = 'OFFLINE';

    // CRT-style collapse: squash vertically with a bright flash,
    // then squash the resulting line away to nothing
    const collapse = gsap.timeline();
    collapse
      .to(panel, { scaleY: 0.008, filter: 'brightness(3)', duration: 0.28, ease: 'power2.in' })
      .to(panel, { scaleX: 0, opacity: 0, duration: 0.14, ease: 'none' });
    await collapse;

    panel.classList.add('hidden-content');
  }

  async function outagePause(){
    const tl = gsap.timeline();
    tl.fromTo(outageMark,
      { opacity: 0 },
      { opacity: 1, duration: 0.175, repeat: 3, yoyo: true, ease: 'power1.inOut' }
    )
    .set(outageMark, { opacity: 0 })
    .to({}, { duration: reduced ? 0.1 : 0.25 });
    await tl;
  }

  async function powerOn(){
    if (reduced){
      gsap.set(panel, { clearProps: 'all' });
      panel.classList.remove('hidden-content');
      led.className = 'led';
      statusText.textContent = 'ONLINE';
      startMeter();
      await gsap.to({}, { duration: 0.1 });
      return;
    }

    panel.classList.remove('hidden-content');

    // reverse of the collapse: thin line appears, then the tube
    // "warms up" — bright flash settling back to normal
    const restore = gsap.timeline();
    restore
      .to(panel, { scaleX: 1, opacity: 1, duration: 0.12, ease: 'none' })
      .fromTo(panel,
        { scaleY: 0.008, filter: 'brightness(3)' },
        { scaleY: 0.05, filter: 'brightness(2.2)', duration: 0.13, ease: 'power1.out' }
      )
      .to(panel, { scaleY: 1, filter: 'brightness(1)', duration: 0.19, ease: 'power2.out' });
    await restore;

    gsap.set(panel, { clearProps: 'scaleX,scaleY,opacity,filter' });
    led.className = 'led';
    statusText.textContent = 'ONLINE';
    startMeter();
  }

  async function runCycle(){
    if (animating) return;
    animating = true;
    trigger.disabled = true;

    await powerOff();
    revealBreakerTheme();
    await outagePause();
    await powerOn();

    trigger.disabled = false;
    animating = false;

    // give the person a beat to see it's back online, then move on
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  }

  trigger.addEventListener('click', runCycle);
})();
