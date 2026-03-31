// ==UserScript==
// @name         AviatorIQ — Multi-Casino Interceptor
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Intercepts Aviator WebSocket frames and streams crash points directly to the AviatorIQ Render backend.
// @author       AviatorIQ
// @run-at       document-start
// @match        *://*.spribegaming.com/*
// @match        *://aviator-next.spribegaming.com/*
// @match        *://*.sportpesa.co.ke/*
// @match        *://*.betika.com/*
// @match        *://*.1xbet.com/*
// @match        *://*.msport.com/*
// @match        *://*.mozzartbet.co.ke/*
// @match        *://*.betway.co.ke/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      localhost
// @connect      127.0.0.1
// @connect      onrender.com
// ==/UserScript==

;(function() {
    'use strict';

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const log  = (...a) => console.log('%c[AviatorIQ]', 'color:#ff6b35;font-weight:bold', ...a);
    const warn = (...a) => console.warn('%c[AviatorIQ]', 'color:#ffa726;font-weight:bold', ...a);

    /* ─── CONFIG ───────────────────────────────────────────────────────────
     * Set your Render backend URL and secret in localStorage before loading:
     *   localStorage.setItem('aviatoriq_backend', 'https://your-app.onrender.com')
     *   localStorage.setItem('aviatoriq_secret', 'your-interceptor-secret')
     *
     * OR use the casino selector in the AviatorIQ dashboard to generate
     * a fully pre-configured script automatically.
     */
    const BACKEND = (
        win.localStorage?.getItem('aviatoriq_backend') ||
        win.AVIATORIQ_BACKEND ||
        ''
    ).replace(/\/$/, '');

    const SECRET = (
        win.localStorage?.getItem('aviatoriq_secret') ||
        win.AVIATORIQ_SECRET ||
        ''
    );

    /* ─── CASINO AUTO-DETECT ─────────────────────────────────────────────── */
    const host = window.location.hostname;
    const CASINO_MAP = {
        'sportpesa.co.ke': 'sportpesa',
        'betika.com':       'betika',
        'mozzartbet.co.ke': 'mozzart',
        '1xbet.com':        '1xbet',
        'msport.com':       'msport',
        'betway.co.ke':     'betway',
        'spribegaming.com': 'spribe',
    };

    let CASINO_ID = 'unknown';
    for (const [pattern, id] of Object.entries(CASINO_MAP)) {
        if (host.includes(pattern)) { CASINO_ID = id; break; }
    }
    // Allow localStorage override (set by generated script from dashboard)
    CASINO_ID = win.localStorage?.getItem('aviatoriq_casino') || CASINO_ID;

    /* ─── STATE ──────────────────────────────────────────────────────────── */
    const state = { lastCrash: null, lastCrashAt: 0, hud: null };

    log(`v5.0 | casino=${CASINO_ID} | backend=${BACKEND || '⚠ NOT SET'}`);
    if (!BACKEND) {
        warn('No backend configured! Set localStorage.aviatoriq_backend to your Render URL.');
    }

    /* ─── WEBSOCKET PROXY ────────────────────────────────────────────────── */
    const NativeWS = win.WebSocket;
    if (!NativeWS) { warn('WebSocket unavailable'); return; }

    win.WebSocket = new Proxy(NativeWS, {
        construct(Target, args) {
            const ws = new Target(...args);
            log('WSS hooked →', args[0]);
            ws.addEventListener('message', ev => {
                try { parseFrame(ev.data); } catch (e) { warn('parse err', e); }
            });
            return ws;
        }
    });

    /* ─── FRAME PARSER ───────────────────────────────────────────────────── */
    function parseFrame(raw) {
        if (typeof raw !== 'string') return;

        const parts = raw.split('\x00').filter(f => f.trim());
        for (const frame of parts) {
            let msg;
            try { msg = JSON.parse(frame); } catch { continue; }

            const ch     = msg.c || '';
            const action = msg.a || '';
            const p      = msg.p || {};

            if (ch === 'sys') {
                if (action === 'handshake') log('Handshake OK');
                if (action === 'login')     log('Login:', p.name, 'zone:', p.zone);
                continue;
            }

            if (ch !== 'ext') continue;

            if (action === 'changeState')    handleStateChange(p);
            if (['roundChartInfo','chartInfo','gameTick'].includes(action)) handleTick(p);
            if (['roundResult','gameResult','crashResult','planeCrashed','roundEnd','gameEnd'].includes(action)) handleCrash(p);
        }
    }

    function handleStateChange(p) {
        const s = (p.state || p.s || p.gameState || '').toUpperCase();
        updateHud(null, s);
    }

    function handleTick(p) {
        const m = parseFloat(p.mult ?? p.m ?? p.multiplier ?? p.x ?? 0);
        if (Number.isFinite(m) && m >= 1) updateHud(m, 'FLYING');
    }

    function handleCrash(p) {
        const raw = p.crashPoint ?? p.crash ?? p.mult ?? p.m ?? p.multiplier ?? p.result ?? p.value ?? p.coef ?? p.x;
        const crash = Math.round(parseFloat(raw) * 100) / 100;
        if (!Number.isFinite(crash) || crash < 1) return;

        const now = Date.now();
        if (crash === state.lastCrash && now - state.lastCrashAt < 3000) return;
        state.lastCrash   = crash;
        state.lastCrashAt = now;

        log(`CRASH → ${crash}x`);
        updateHud(crash, 'CRASHED');
        sendCrash(crash);
    }

    /* ─── BACKEND POST ───────────────────────────────────────────────────── */
    function sendCrash(multiplier) {
        if (!BACKEND) {
            warn('Cannot send — backend URL not configured.');
            return;
        }

        GM_xmlhttpRequest({
            method:  'POST',
            url:     `${BACKEND}/add`,
            headers: {
                'Content-Type':        'application/json',
                'X-AviatorIQ-Secret':  SECRET,
            },
            data: JSON.stringify({
                multiplier,
                casino_id: CASINO_ID,
                source:    'tampermonkey',
            }),
            onload: r => {
                if (r.status >= 200 && r.status < 300) {
                    log(`${multiplier}x → Render OK (${r.status})`);
                } else {
                    warn(`Render rejected crash: HTTP ${r.status}`, r.responseText);
                }
            },
            onerror: e => warn('Network error', e),
        });
    }

    /* ─── HUD ────────────────────────────────────────────────────────────── */
    function injectHud() {
        if (state.hud || !document.body) return;
        state.hud = document.createElement('div');
        state.hud.id = '__aviatoriq_hud__';
        Object.assign(state.hud.style, {
            position: 'fixed', top: '10px', right: '10px',
            zIndex: '2147483647', pointerEvents: 'none',
            background: 'rgba(8,8,12,0.88)', backdropFilter: 'blur(12px)',
            border: '1px solid #ff6b35', color: '#ff6b35',
            fontFamily: '"Courier New", monospace', fontWeight: '700', fontSize: '13px',
            padding: '6px 14px 7px', borderRadius: '20px',
            letterSpacing: '1px', boxShadow: '0 3px 14px rgba(255,107,53,0.3)',
            transition: 'color .25s, border-color .25s',
        });
        state.hud.textContent = `AviatorIQ · ${CASINO_ID}`;
        document.body.appendChild(state.hud);
    }

    function updateHud(multiplier, gameState) {
        injectHud();
        if (!state.hud) return;

        if (gameState === 'CRASHED') {
            state.hud.style.color = '#ef5350';
            state.hud.style.borderColor = '#ef5350';
            state.hud.textContent = `CRASHED ${multiplier}x`;
            return;
        }

        if (Number.isFinite(multiplier) && multiplier >= 1) {
            const color = multiplier < 1.5 ? '#ef5350' : multiplier < 3 ? '#ffa726' : multiplier < 7 ? '#ffffff' : '#5cdb95';
            state.hud.style.color = color;
            state.hud.style.borderColor = color;
            state.hud.textContent = multiplier.toFixed(2) + 'x';
            return;
        }

        if (gameState) {
            state.hud.style.color = '#ffa726';
            state.hud.style.borderColor = '#ffa726';
            state.hud.textContent = gameState;
        }
    }

    if (document.body) injectHud();
    window.addEventListener('DOMContentLoaded', injectHud);

})();
