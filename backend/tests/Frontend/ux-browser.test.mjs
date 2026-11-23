import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import test from 'node:test';

test('UX-01 pantallas reales con fixtures: responsive, teclado, triestado y payload', { timeout: 120000 }, async () => {
    const evidence = path.resolve('../docs/producto/evidencias-ux01');
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'sisweb-ux-'));
    const bundle = path.join(temp, 'fixture.js');
    await build({ entryPoints: ['tests/Frontend/ux-browser-fixture.tsx'], bundle: true, outfile: bundle, format: 'esm', jsx: 'automatic', alias: { '@': path.resolve('resources/js') }, define: { 'process.env.NODE_ENV': '"development"' } });
    const manifest = JSON.parse(await fs.readFile('public/build/manifest.json', 'utf8'));
    const css = await fs.readFile(path.join('public/build', manifest['resources/js/app.tsx'].css[0]));
    const received = [];
    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST') { let data = ''; for await (const chunk of req) data += chunk; received.push({ url: req.url, body: JSON.parse(data) }); res.writeHead(303, { Location: '/?pantalla=Datos&error=1' }); res.end(); return; }
        if (req.headers['x-inertia']) { res.writeHead(200, { 'Content-Type': 'application/json', 'X-Inertia': 'true' }); res.end(JSON.stringify({ component: 'Datos', props: { auth: { user: null }, errors: { nombre_comercio: 'Error de prueba: conserva los datos.' } }, url: req.url, version: null, clearHistory: false, encryptHistory: false })); return; }
        if (/^\/images\/[a-z0-9-]+\.webp$/.test(req.url ?? '')) { res.setHeader('Content-Type', 'image/webp'); res.end(await fs.readFile(path.join('public', req.url))); return; }
        if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(await fs.readFile(bundle)); return; }
        if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); return; }
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="csrf-token" content="sintetico"><title>Fixture UX-01</title><link rel="stylesheet" href="/fixture.css"></head><body><div id="app"></div><script type="module" src="/fixture.js"></script></body></html>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const edge = process.env.UX_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${path.join(temp, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let socket;
    try {
        const browserUrl = await new Promise((resolve, reject) => { let output = ''; browser.stderr.on('data', (data) => { output += data; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) resolve(match[1]); }); browser.once('error', reject); setTimeout(() => reject(new Error('Navegador no disponible')), 15000).unref(); });
        const debugPort = new URL(browserUrl).port;
        const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
        socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
        let id = 0;
        const pending = new Map();
        const errors = [];
        socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); if (message.id) { const handlers = pending.get(message.id); pending.delete(message.id); if (message.error) handlers.reject(message.error); else handlers.resolve(message.result); } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description || '')); });
        const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
        const evaluate = async (expression) => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description); return result.result.value; };
        await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
        await send('Network.setBlockedURLs', { urls: ['https://*', '*generativelanguage.googleapis.com*'] });
        const wait = async (expression) => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 50)); } throw Error('No se cumplió: ' + expression); };
        const observations = [];
        for (const pantalla of ['Inicio', 'Datos', 'Condiciones', 'Resumen', 'Subsanar', 'Expediente', 'Login', 'Registro', 'Proveedor', 'Productos', 'Ventas', 'MiNegocio', 'Planes', 'Admin', 'Panel', 'Aliados']) {
            for (const width of [320, 390, 768, 1440]) {
                await send('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
                await send('Page.navigate', { url: `http://127.0.0.1:${port}/?pantalla=${pantalla}` });
                await wait('document.querySelector("h1") !== null');
                const layout = await evaluate('({h1:document.querySelectorAll("h1").length, width:innerWidth, content:document.documentElement.scrollWidth, title:document.querySelector("h1").textContent, missingLabels:[...document.querySelectorAll("input:not([type=hidden]),select,textarea")].filter(el=>!el.labels?.length&&!el.getAttribute("aria-label")&&!el.getAttribute("aria-labelledby")).length})');
                observations.push({ pantalla, ...layout });
                if (layout.content > width + 1) {
                    const overflow = await evaluate('[...document.querySelectorAll("body *")].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,25).map(el=>({tag:el.tagName,classes:el.className,text:el.textContent.slice(0,90),right:el.getBoundingClientRect().right}))');
                    await fs.writeFile(path.join(evidence, 'overflow.json'), JSON.stringify(overflow, null, 2));
                }
                assert.equal(layout.h1, 1, pantalla + ' H1');
                assert.ok(layout.content <= width + 1, `${pantalla} overflow ${layout.content}/${width}`);
                assert.equal(layout.missingLabels, 0, pantalla + ' labels');
                if (width === 390 || width === 1440) { const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await fs.writeFile(path.join(evidence, `${pantalla.toLowerCase()}-${width}.png`), Buffer.from(shot.data, 'base64')); }
            }
        }
        // Panel "Lo que te falta": al elegir un ítem se muestran sus proveedores.
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1300, deviceScaleFactor: 1, mobile: false });
        await send('Page.navigate', { url: `http://127.0.0.1:${port}/?pantalla=Subsanar` });
        await wait('document.querySelector("#falta-titulo") !== null');
        await evaluate(`[...document.querySelectorAll('[aria-pressed]')].find(b=>b.textContent.includes('Botiquín')).click()`);
        await wait(`document.body.innerText.includes('Proveedores de tu zona')`);
        assert.match(await evaluate('document.querySelector("a[href^=\\"https://wa.me/\\"]").href'), /Botiqu%C3%ADn/);
        // El cliente habla en privado con el proveedor: no hay selección ni presupuesto.
        assert.equal(await evaluate('document.querySelectorAll("input[name^=\\"oferta-\\"]").length'), 0);
        assert.doesNotMatch(await evaluate('document.querySelector("#falta-titulo").closest("section").innerText'), /presupuesto/i);
        await evaluate('document.querySelector("#falta-titulo").scrollIntoView()');
        await new Promise((r) => setTimeout(r, 300));
        const panelFalta = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await fs.writeFile(path.join(evidence, 'subsanar-lo-que-falta-1440.png'), Buffer.from(panelFalta.data, 'base64'));
        await send('Page.navigate', { url: `http://127.0.0.1:${port}/?pantalla=Datos` });
        await wait('document.querySelector("#est-nombre") !== null');
        await evaluate(`(()=>{const input=document.querySelector('#est-nombre');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Local sintético UX');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
        const click = (label) => evaluate(`([...document.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify(label)})).click()`);
        // Tipo «Otro»: se pregunta todo y ninguna respuesta queda puesta por el sistema.
        await evaluate('document.querySelector("[data-cy=rubro-otro]").click()');
        await click('2. Cómo es tu local');
        await wait(`document.querySelector('#grupo-datos').textContent.includes('Cómo es tu local')`);
        assert.equal(await evaluate('document.querySelectorAll("[aria-pressed=true]").length > 0'), true);
        await evaluate(`document.querySelector('[aria-labelledby="label-usa_glp"] button').click()`);
        // El resumen está al final del paso 2.
        assert.match(await evaluate('document.body.innerText'), /Local sintético UX/);
        await click('1. Tu negocio');
        assert.equal(await evaluate('document.querySelector("#est-nombre").value'), 'Local sintético UX');
        await click('2. Cómo es tu local');
        await click('Guardar y ver las condiciones');
        await wait('document.body.textContent.includes("Error de prueba")');
        assert.equal(received.length, 1);
        assert.equal(received[0].body.usa_glp, false);
        assert.equal(received[0].body.tiene_equipos_fritura, null);
        assert.equal(received[0].body.nombre_comercio, 'Local sintético UX');
        await send('Page.navigate', { url: `http://127.0.0.1:${port}/?pantalla=Condiciones` });
        await wait('document.querySelector("input[type=radio]") !== null');
        await evaluate('document.querySelector("input[type=radio]").focus()');
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        assert.equal(await evaluate('document.querySelector("input[type=radio]").checked'), true);
        assert.equal(await evaluate('document.querySelector("progress").value'), 1);
        // Al responder ya se envía un guardado automático; los de «Pausar» se cuentan desde aquí.
        await new Promise((r) => setTimeout(r, 300));
        const previos = await evaluate('window.__uxRequests.length');
        await evaluate('window.__uxSaveFails = true');
        await click('Pausar y guardar progreso');
        await wait(`window.__uxRequests.length === ${previos + 1}`);
        await wait('document.body.textContent.includes("Error sintético al guardar")');
        assert.equal(await evaluate('document.querySelector("input[type=radio]").checked'), true);
        assert.equal(await evaluate('document.body.textContent.includes("Avance guardado correctamente")'), false);
        await evaluate('window.__uxSaveFails = false');
        await click('Pausar y guardar progreso');
        await wait('document.body.textContent.includes("Avance guardado correctamente")');
        assert.equal(await evaluate('window.__uxRequests.length'), previos + 2);
        const saved = await evaluate('window.__uxRequests[window.__uxRequests.length - 1]');
        assert.ok(JSON.stringify(saved.body).includes('CUMPLE_DECLARADO'));
        await send('Page.navigate', { url: `http://127.0.0.1:${port}/?pantalla=Condiciones&cerrada=1` });
        await wait('document.querySelector("input[type=radio]") !== null');
        assert.equal(await evaluate('[...document.querySelectorAll("input[type=radio]")].every(el=>el.disabled)'), true);
        await send('Page.navigate', { url: `http://127.0.0.1:${port}/?pantalla=Resumen&cerrada=1` });
        await wait('document.querySelector("h1") !== null');
        assert.match(await evaluate('document.body.textContent'), /Registro cerrado/);
        assert.equal(await evaluate('[...document.querySelectorAll("button")].some(el=>el.textContent.includes("Confirmar y Registrar"))'), false);
        assert.equal(errors.length, 0, errors.join('\n'));
        await fs.writeFile(path.join(evidence, '29-navegador.json'), JSON.stringify({ browser: edge, synthetic: true, real_backend: false, observations, payload: received[0], checklist_request: saved, runtime_errors: errors, external_http_blocked: true }, null, 2));
    } finally { socket?.close(); browser.kill(); await new Promise((resolve) => server.close(resolve)); }
});
