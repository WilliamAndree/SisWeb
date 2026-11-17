import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptarAnalisis, mensajeErrorAnalisis, sondearAnalisis } from '../../resources/js/lib/analisis-ia.ts';

const resultado = { calidad_imagen: 'OPTIMA', nivel_incertidumbre: 'MUY_ALTO', elementos_detectados: [{ element_name: 'Extintor', visual_status: 'NO_DETERMINABLE_POR_FOTOGRAFIA', description: 'Vigencia no observable' }], observaciones_visuales: ['Cilindro'], no_observable: ['Carga'], recomendaciones_captura: ['Etiqueta'], raw_payload_salida: { secreto: 'privado' } };
test('JSON raíz conserva incertidumbre y no observable sin exponer payload privado', () => {
    const adapted = adaptarAnalisis({ uuid_analisis: 'demo', estado: 'REQUIERE_REVISION', resultado }, 'estado');
    assert.equal(adapted.estado, 'REQUIERE_REVISION');
    assert.equal(adapted.resultado.nivel_incertidumbre, 'MUY_ALTO');
    assert.deepEqual(adapted.resultado.not_observable, ['Carga']);
    assert.deepEqual(adapted.resultado.elementos_detectados, [{ elemento: 'Extintor', estado_visual: 'NO_DETERMINABLE_POR_FOTOGRAFIA', detalle: 'Vigencia no observable' }]);
    assert.equal('raw_payload_salida' in adapted.resultado, false);
});
test('prop inicial usa su proyección explícita y arrays ausentes no causan crash', () => {
    const adapted = adaptarAnalisis({ uuid: 'demo', estado: 'COMPLETADO', resultado: { ...resultado, visual_observations: ['Inicial'], not_observable: null } }, 'inicial');
    assert.deepEqual(adapted.resultado.visual_observations, ['Inicial']);
    assert.deepEqual(adapted.resultado.not_observable, []);
    assert.equal(adaptarAnalisis({ analisis: { uuid: 'demo', estado: 'COMPLETADO' } }, 'estado'), null);
});
test('mensajes públicos prevalecen sobre códigos técnicos', () => {
    assert.equal(mensajeErrorAnalisis({ mensaje: 'Evidencia alterada', error: 'INTEGRIDAD' }, 409), 'Evidencia alterada');
    assert.match(mensajeErrorAnalisis({}, 419), /sesión venció/);
});
for (const estado of ['COMPLETADO', 'REQUIERE_REVISION', 'FALLIDO']) {
    test(`sondeo termina en ${estado} sin nuevas peticiones`, async () => {
        const tareas = [];
        let received;
        sondearAnalisis({ url: '/simulado', uuid: 'demo', esperar: (fn) => { tareas.push(fn); return 0; }, fetcher: async () => Response.json({ uuid_analisis: 'demo', estado, resultado }), onResultado: (data) => { received = data; }, onError: assert.fail });
        tareas.shift()();
        await new Promise(setImmediate);
        assert.equal(received.estado, estado);
        assert.equal(tareas.length, 0);
    });
}
test('403 detiene sondeo y presenta error contextual', async () => {
    const tareas = [];
    let error;
    sondearAnalisis({ url: '/simulado', uuid: 'demo', esperar: (fn) => { tareas.push(fn); return 0; }, fetcher: async () => Response.json({}, { status: 403 }), onResultado: assert.fail, onError: (message) => { error = message; } });
    tareas.shift()();
    await new Promise(setImmediate);
    assert.match(error, /permiso/);
    assert.equal(tareas.length, 0);
});
test('desmontar aborta petición e impide actualizar estado', async () => {
    let tarea;
    let signal;
    let resolve;
    const cancelar = sondearAnalisis({ url: '/simulado', uuid: 'demo', esperar: (fn) => { tarea = fn; return 0; }, fetcher: (_url, options) => { signal = options.signal; return new Promise((r) => { resolve = r; }); }, onResultado: assert.fail, onError: assert.fail });
    tarea();
    cancelar();
    resolve(Response.json({ uuid_analisis: 'demo', estado: 'COMPLETADO' }));
    await new Promise(setImmediate);
    assert.equal(signal.aborted, true);
});

test('sesión expirada con HTML detiene el sondeo sin tratarlo como fallo IA', async () => {
    const tareas = [];
    let error;
    sondearAnalisis({ url: '/simulado', uuid: 'demo', esperar: (fn) => { tareas.push(fn); return 0; }, fetcher: async () => new Response('<html>Sesión expirada</html>', { status: 419 }), onResultado: assert.fail, onError: (message) => { error = message; } });
    tareas.shift()();
    await new Promise(setImmediate);
    assert.match(error, /sesión venció/);
    assert.equal(tareas.length, 0);
});

test('pendiente pasa a completado con una petición a la vez', async () => {
    const tareas = [];
    const estados = [];
    let calls = 0;
    sondearAnalisis({ url: '/simulado', uuid: 'demo', esperar: (fn) => { tareas.push(fn); return 0; }, fetcher: async () => Response.json({ uuid_analisis: 'demo', estado: ++calls === 1 ? 'EN_PROCESO' : 'COMPLETADO' }), onResultado: (data) => estados.push(data.estado), onError: assert.fail });
    tareas.shift()();
    assert.equal(tareas.length, 0);
    await new Promise(setImmediate);
    assert.equal(tareas.length, 1);
    tareas.shift()();
    await new Promise(setImmediate);
    assert.deepEqual(estados, ['EN_PROCESO', 'COMPLETADO']);
    assert.equal(tareas.length, 0);
});

test('respuesta con UUID diferente no se presenta y no se vuelve a consultar', async () => {
    const tareas = [];
    let error;
    sondearAnalisis({ url: '/simulado', uuid: 'demo', esperar: (fn) => { tareas.push(fn); return 0; }, fetcher: async () => Response.json({ uuid_analisis: 'ajeno', estado: 'COMPLETADO' }), onResultado: assert.fail, onError: (message) => { error = message; } });
    tareas.shift()();
    await new Promise(setImmediate);
    assert.match(error, /no es válida/);
    assert.equal(tareas.length, 0);
});
