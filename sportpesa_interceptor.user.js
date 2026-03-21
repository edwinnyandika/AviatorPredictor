// ==UserScript==
// @name         Aviator AI Predictor — SFS2X Interceptor
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Hooks Spribe Aviator SmartFoxServer WebSocket via Proxy. Streams crash points to Python AI backend.
// @author       AviatorAI
// @run-at       document-start
// @match        *://*.spribegaming.com/*
// @match        *://aviator-next.spribegaming.com/*
// @match        *://*.sportpesa.co.ke/*
// @match        *://*.betika.com/*
// @match        *://*.1xbet.com/*
// @match        *://*.msport.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

/**
 * v4.0 — Uses a Proxy constructor hook instead of a wrapper function.
 * This avoids ALL "read-only property" and prototype chain errors.
 *
 * The game (Angular app in main.c86da860cac43d9d.js) IS loading.
 * onChangeState IS being called. The WebSocket IS connecting.
 * We just need the hook to not crash, and data will flow.
 *
 * utils.js / tabutils.js / contextmenu.js / download.js errors =
 *   other browser extensions. Not our problem. Ignore them.
 */

;(function() {
    'use strict';

    const BACKEND = (
        // ⚙️  CONFIGURE: Change this after Vercel deployment!
        // DEV  → 'http://localhost:3000/api/crash'
        // PROD → 'https://your-app.vercel.app/api/crash'
        window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api/crash'
            : 'https://aviator-predictor.vercel.app/api/crash'
    );
    const win     = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const log     = (...a) => console.log('%c[AviatorAI]', 'color:#ff6b35;font-weight:bold', ...a);
    const warn    = (...a) => console.warn('%c[AviatorAI]', 'color:#ffa726;font-weight:bold', ...a);

    log('⚡ v4.0 | Proxy hook starting...');

    // ──────────────────────────────────────────────────────────────
    //  WEBSOCKET PROXY HOOK
    //  Using Proxy.construct() is the correct way to intercept a
    //  constructor in JavaScript. It requires ZERO property copying
    //  and works perfectly with instanceof checks.
    // ──────────────────────────────────────────────────────────────
    const NativeWS = win.WebSocket;

    win.WebSocket = new Proxy(NativeWS, {
        construct(Target, args) {
            // Create the real WebSocket normally
            const ws = new Target(...args);
            log('🔌 WebSocket intercepted →', args[0]);

            // Attach our listener without interfering with existing ones
            ws.addEventListener('message', (evt) => {
                try { parseFrame(evt.data); } catch (_) {}
            });

            return ws;
        }
    });

    log('✅ Proxy WebSocket hook installed on', win.location.href);

    // ──────────────────────────────────────────────────────────────
    //  SFS2X PARSER
    //  SFS2X frames: NUL-terminated (\x00) JSON
    //  e.g.  {"c":"ext","a":"roundResult","p":{"crashPoint":2.34}}
    // ──────────────────────────────────────────────────────────────
    const _sent = { crash: null, ts: 0 };

    function parseFrame(raw) {
        if (typeof raw !== 'string') return;

        const frames = raw.split('\x00').filter(s => s.trim());
        for (const frame of frames) {
            let msg;
            try { msg = JSON.parse(frame); } catch (_) { continue; }

            const c = msg.c || '';
            const a = msg.a || '';
            const p = msg.p || {};

            // Log ALL ext events during debugging so we can see field names live
            if (c === 'ext') {
                log(`📦 [${a}]`, JSON.stringify(p).substring(0, 200));
            }

            if (c === 'sys') {
                if (a === 'handshake') log('🤝 SFS2X Handshake OK');
                if (a === 'login')     log('🔓 Logged in:', p.name, '| zone:', p.zone);
                if (a === 'joinRoom')  log('🏠 Joined room:', p.n || p.name || '?');
            }

            if (c === 'ext') {
                // State transitions
                if (a === 'changeState') {
                    onStateChange(p);
                }
                // Live multiplier ticks
                if (a === 'roundChartInfo' || a === 'chartInfo' || a === 'gameTick') {
                    onTick(p);
                }
                // FINAL crash result — try ALL known field names from different Spribe builds
                if (a === 'roundResult' || a === 'gameResult' ||
                    a === 'crashResult' || a === 'planeCrashed' ||
                    a === 'roundEnd'    || a === 'gameEnd') {
                    onCrash(p);
                }
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    //  EVENT HANDLERS
    // ──────────────────────────────────────────────────────────────
    function onStateChange(p) {
        const s = p.state || p.s || p.gameState || '?';
        log(`🔄 State → ${s}`);
        updateHUD(null, String(s).toUpperCase());
    }

    function onTick(p) {
        const m = parseFloat(p.mult ?? p.m ?? p.multiplier ?? p.x ?? 0);
        if (m >= 1.0) updateHUD(m, 'FLYING');
    }

    function onCrash(p) {
        // Exhaust all known field names across Spribe & operator variants
        const raw = p.crashPoint ?? p.crash   ?? p.mult       ??
                    p.m          ?? p.multiplier ?? p.result    ??
                    p.value      ?? p.coef      ?? p.x         ?? null;
        if (!raw) { warn('No crash field found in:', p); return; }

        const crash = Math.round(parseFloat(raw) * 100) / 100;
        if (crash < 1.0) return;

        // Debounce — no duplicate sends within 3s
        const now = Date.now();
        if (crash === _sent.crash && now - _sent.ts < 3000) return;
        _sent.crash = crash;
        _sent.ts    = now;

        log(`🎯 CRASH: ${crash}x → AI Engine`);
        updateHUD(crash, 'CRASHED');
        send(crash);
    }

    // ──────────────────────────────────────────────────────────────
    //  BACKEND PUSH
    // ──────────────────────────────────────────────────────────────
    function send(multiplier) {
        GM_xmlhttpRequest({
            method:  'POST',
            url:     BACKEND,
            headers: { 'Content-Type': 'application/json' },
            data:    JSON.stringify({ multiplier }),
            onload:  r  => log(`✅ ${multiplier}x streamed → AI (HTTP ${r.status})`),
            onerror: () => warn('❌ Backend offline. Is live_predictor_server.py running?')
        });
    }

    // ──────────────────────────────────────────────────────────────
    //  FLOATING HUD OVERLAY
    //  A premium live-multiplier ticker injected over the casino page
    // ──────────────────────────────────────────────────────────────
    let hud = null;

    window.addEventListener('DOMContentLoaded', injectHUD);
    // Fallback: if DOMContentLoaded already fired (e.g., in iframe)
    if (document.body) injectHUD();

    function injectHUD() {
        if (hud) return;
        hud = document.createElement('div');
        hud.id = '__avi_ai_hud__';
        Object.assign(hud.style, {
            position: 'fixed', top: '10px', right: '10px',
            zIndex: '2147483647', pointerEvents: 'none',
            background: 'rgba(8,8,12,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #ff6b35',
            color: '#ff6b35',
            fontFamily: '"Courier New", monospace',
            fontWeight: '700', fontSize: '13px',
            padding: '6px 14px 7px',
            borderRadius: '20px',
            letterSpacing: '1px',
            boxShadow: '0 3px 14px rgba(255,107,53,0.3)',
            transition: 'color .25s, border-color .25s'
        });
        hud.textContent = '🤖 AviatorAI • Listening…';
        document.body.appendChild(hud);
        log('🖥️  HUD injected');
    }

    function updateHUD(mult, state) {
        if (!hud) injectHUD();
        if (!hud) return;

        if (state === 'CRASHED') {
            hud.style.color = hud.style.borderColor = '#ef5350';
            hud.textContent = `💥 CRASHED  ${mult}x`;
        } else if (mult) {
            const col = mult < 1.5  ? '#ef5350' :
                        mult < 3    ? '#ffa726' :
                        mult < 7    ? '#ffffff' : '#5cdb95';
            hud.style.color = hud.style.borderColor = col;
            hud.textContent = `🚀 ${mult.toFixed(2)}x`;
        } else if (state) {
            hud.style.color = hud.style.borderColor = '#ffa726';
            hud.textContent = `🎲 ${state}`;
        }
    }

    // ──────────────────────────────────────────────────────────────
    //  WINDOW VARIABLE POLLER (backup for deeply obfuscated builds)
    // ──────────────────────────────────────────────────────────────
    window.addEventListener('load', () => {
        const WATCH = ['crashPoint','lastCrash','lastMultiplier',
                       'game.lastMultiplier','__aviator__'];
        let prev = null;
        setInterval(() => {
            for (const key of WATCH) {
                const v = key.split('.').reduce((o, k) => o?.[k], win);
                if (v && parseFloat(v) >= 1.0 && v !== prev) {
                    prev = v;
                    log(`🕵️  Poller: window.${key} = ${v}`);
                    onCrash({ crash: v });
                    break;
                }
            }
        }, 600);
    });

    log('🟢 Interceptor ready — waiting for game activity');
})();
