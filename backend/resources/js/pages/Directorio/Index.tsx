import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Compass,
  DoorClosed,
  FileCheck,
  Flame,
  MapPin,
  MessageCircle,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Store,
  Wrench,
  Zap,
} from 'lucide-react';
import { ModalAfiliacion } from '@/components/Directorio/ModalAfiliacion';
import { ModalContactoProveedor } from '@/components/Directorio/ModalContactoProveedor';
import type { AliadoAsistenciaContrato } from '@/types/contrato';

interface FiltroOpcion {
  valor: string;
  etiqueta: string;
}

interface DirectorioProps {
  aliados: AliadoAsistenciaContrato[];
  filtros: {
    categoria: string | null;
    distrito: string | null;
  };
  categorias: FiltroOpcion[];
  distritos: FiltroOpcion[];
}

/** Rótulo corto de la especialidad, para el badge de categoría. */
const ETIQUETA_CATEGORIA: Record<string, string> = {
  electricas: 'Electricidad y Puesta a Tierra',
  incendios: 'Extintores y Señalética',
  arquitectura_senaletica: 'Arquitectura, Planos y Evacuación',
  estructuras: 'Estructuras y Vidrios',
  gas: 'Instalaciones de Gas GLP',
};

/** Icono temático por especialidad, para la cabecera de la tarjeta. */
const ICONO_CATEGORIA: Record<string, typeof Zap> = {
  electricas: Zap,
  incendios: Flame,
  arquitectura_senaletica: Compass,
  estructuras: DoorClosed,
  gas: Flame,
};

/**
 * Renderiza el badge de acreditación técnica oficial de forma objetiva,
 * diferenciando habilitaciones profesionales (CIP/CAP), empresas mantenedoras (NTP)
 * y registros de energía (OSINERGMIN).
 */
function renderBadgeAcreditacion(aliado: AliadoAsistenciaContrato) {
  const texto =
    aliado.acreditacion || (aliado.verificado ? 'Acreditación Técnica Validada' : 'Técnico Especialista');
  const lower = texto.toLowerCase();

  let estiloBadge = 'border-slate-200 bg-slate-50 text-slate-700';
  let Icono = ShieldCheck;

  if (lower.includes('cip') || lower.includes('ingenier')) {
    estiloBadge = 'border-sky-300 bg-sky-50 text-sky-900';
    Icono = FileCheck;
  } else if (lower.includes('cap') || lower.includes('arquitect')) {
    estiloBadge = 'border-purple-300 bg-purple-50 text-purple-900';
    Icono = FileCheck;
  } else if (lower.includes('ntp') || lower.includes('extintor') || lower.includes('mantenedora')) {
    estiloBadge = 'border-amber-300 bg-amber-50 text-amber-900';
    Icono = ShieldCheck;
  } else if (lower.includes('osinergmin') || lower.includes('gas') || lower.includes('d.s.')) {
    estiloBadge = 'border-rose-300 bg-rose-50 text-rose-900';
    Icono = ShieldCheck;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-2xs ${estiloBadge}`}
    >
      <Icono className="h-3.5 w-3.5 shrink-0" />
      <span>{texto}</span>
    </span>
  );
}

/**
 * Canal de afiliación de nuevos prestadores. Configurable con
 * `VITE_WHATSAPP_ALIADOS`; sin número definido, el CTA abre un modal con los
 * datos de contacto en lugar de enlazar un número ficticio.
 */
const WHATSAPP_ALIADOS_NUMERO = import.meta.env.VITE_WHATSAPP_ALIADOS ?? '';

export default function Directorio({
  aliados,
  filtros,
  categorias,
  distritos,
}: Readonly<DirectorioProps>) {
  const [modalAfiliacionAbierto, setModalAfiliacionAbierto] = useState(false);
  const [aliadoSeleccionado, setAliadoSeleccionado] = useState<AliadoAsistenciaContrato | null>(null);

  const filtroCategoria = filtros.categoria ?? '';
  const filtroDistrito = filtros.distrito ?? '';

  const total = aliados.length;

  const resumenFiltros = useMemo(() => {
    const partes: string[] = [];
    const categoria = categorias.find((c) => c.valor === filtroCategoria);
    const distrito = distritos.find((d) => d.valor === filtroDistrito);

    if (categoria?.valor) partes.push(categoria.etiqueta);
    if (distrito?.valor) partes.push(distrito.etiqueta);

    return partes;
  }, [categorias, distritos, filtroCategoria, filtroDistrito]);

  const aplicarFiltro = (clave: 'categoria' | 'distrito', valor: string) => {
    router.get(
      '/directorio',
      { categoria: filtroCategoria, distrito: filtroDistrito, [clave]: valor },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  };

  const limpiarFiltros = () => {
    router.get('/directorio', {}, { preserveState: true, preserveScroll: true, replace: true });
  };

  const hayFiltros = Boolean(filtroCategoria || filtroDistrito);

  return (
    <>
      <Head title="Directorio Técnico Huancayo - CheckITSE" />

      <div className="bg-slate-50 min-h-screen">
        {/* Encabezado institucional */}
        <header className="border-b border-slate-800 bg-slate-900">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              <Wrench className="h-3.5 w-3.5" />
              Directorio Cívico de Subsanación ITSE
            </span>
            <h1 className="mt-3 max-w-3xl text-2xl leading-tight font-black tracking-tight text-white sm:text-4xl">
              Red Técnica y Especialistas Habilitados — Huancayo
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              Catálogo cívico de profesionales colegiados (CIP/CAP), talleres autorizados y empresas mantenedoras para
              subsanar observaciones técnicas (pozo a tierra, extintores, señalética, GLP y planos). Contacto directo y
              sin intermediarios.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-300">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                {total} {total === 1 ? 'prestador listado' : 'prestadores listados'}
              </span>
              {resumenFiltros.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
                  Filtro: {resumenFiltros.join(' · ')}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
          {/* BANNER DE NEUTRALIDAD, LIBRE COMPETENCIA Y DESLINDE ÉTICO */}
          <section
            aria-label="Marco legal de neutralidad y libre competencia"
            className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-slate-50/80 p-5 sm:p-6 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-700 text-white shadow-xs">
                <Scale className="h-5 w-5" />
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-2.5">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Garantía de Neutralidad Institucional y Libre Elección Ciudadana
                  </h2>
                  <span className="rounded-md border border-sky-300 bg-sky-100/70 px-2.5 py-0.5 text-[10px] font-bold text-sky-900">
                    Ley N° 27444 · D.L. N° 1044 · D.S. N° 002-2018-PCM
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  CheckITSE Huancayo opera como plataforma cívica y académica de orientación técnica. Este directorio no
                  favorece proveedores y resguarda los siguientes principios normativos:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>1. Libertad de Elección</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      El comerciante tiene pleno derecho a contratar a cualquier técnico o empresa de su preferencia,
                      figure o no en este catálogo. No existe obligatoriedad ni exclusividad.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                      <span>2. Cero Comisiones</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      CheckITSE no percibe pagos, no cobra comisiones por contacto ni fija tarifas. La relación económica
                      y la emisión de comprobantes es estrictamente privada y directa.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>3. No Suplantación ITSE</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Ningún prestador puede garantizar la aprobación del trámite ni actuar como inspector municipal. La
                      calificación final corresponde exclusivamente a la Municipalidad de Huancayo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Barra de filtros */}
          <section
            aria-labelledby="filtros-directorio"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
          >
            <h2 id="filtros-directorio" className="sr-only">
              Filtros del directorio
            </h2>

            <fieldset>
              <legend className="text-[11px] font-black tracking-wider text-slate-500 uppercase">
                Especialidad Técnica ITSE
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {categorias.map((categoria) => {
                  const activo = filtroCategoria === categoria.valor;

                  return (
                    <button
                      key={`categoria-${categoria.valor || 'todas'}`}
                      type="button"
                      onClick={() => aplicarFiltro('categoria', categoria.valor)}
                      aria-pressed={activo}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border px-3 py-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                        activo
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {categoria.etiqueta}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-4 border-t border-slate-100 pt-4">
              <legend className="text-[11px] font-black tracking-wider text-slate-500 uppercase">
                Ubicación / Distrito
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {distritos.map((distrito) => {
                  const activo = filtroDistrito === distrito.valor;

                  return (
                    <button
                      key={`distrito-${distrito.valor || 'todos'}`}
                      type="button"
                      onClick={() => aplicarFiltro('distrito', distrito.valor)}
                      aria-pressed={activo}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border px-3 py-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                        activo
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {distrito.etiqueta}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Limpiar filtros
              </button>
            )}
          </section>

          {/* Listado de prestadores */}
          {total === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Store className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">
                Sin prestadores para esta combinación de filtros
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
                Prueba con otra especialidad o con todos los distritos. El directorio se alimenta del catálogo cívico
                comunitario de aliados; su cobertura es referencial.
              </p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Ver directorio completo
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {aliados.map((aliado) => {
                const categoria = ETIQUETA_CATEGORIA[aliado.categoria] ?? 'Soporte técnico ITSE';
                const Icono = ICONO_CATEGORIA[aliado.categoria] ?? Store;

                return (
                  <li
                    key={aliado.id}
                    className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-4">
                      {/* Cabecera de la tarjeta: Icono y Acreditación */}
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                          <Icono className="h-5 w-5" />
                        </span>
                        {renderBadgeAcreditacion(aliado)}
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-snug">
                          {aliado.nombre_comercial}
                        </h3>
                        <p className="mt-0.5 text-xs font-bold tracking-wider text-sky-900 uppercase">
                          {categoria}
                        </p>
                        {aliado.contacto_nombre && (
                          <p className="mt-1 text-xs text-slate-500">
                            Atención: {aliado.contacto_nombre}
                          </p>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed text-slate-600">
                        {aliado.especialidad_texto}
                      </p>

                      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>
                          {aliado.sede}
                          {aliado.cobertura ? ` · Cobertura: ${aliado.cobertura}` : ''}
                        </span>
                      </p>

                      {/* Documentación técnica para trámite */}
                      {aliado.entregable_oficial && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                            <FileCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                            <span>Documentación Técnica para Trámite (Formato Normativo)</span>
                          </div>
                          <p className="text-[11px] font-medium leading-relaxed text-emerald-900">
                            {aliado.entregable_oficial}
                          </p>
                        </div>
                      )}

                      {/* Lista de servicios brindados */}
                      {aliado.servicios && aliado.servicios.length > 0 && (
                        <ul className="space-y-1 border-t border-slate-100 pt-3">
                          {aliado.servicios.map((servicio) => (
                            <li
                              key={servicio}
                              className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600"
                            >
                              <span
                                aria-hidden="true"
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
                              />
                              <span>{servicio}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Botón de Contacto / Cotización */}
                    <button
                      type="button"
                      onClick={() => setAliadoSeleccionado(aliado)}
                      className="mt-5 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 active:scale-[0.99]"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-400" />
                      <span>Solicitar cotización directa</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Banner de deslinde cívico inferior */}
          <aside
            role="note"
            aria-label="Deslinde sobre la naturaleza del directorio"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  CheckITSE Huancayo — Herramienta Cívica de Apoyo a la Formalización
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  La plataforma no comercializa servicios, no cobra comisiones ni fija precios. La contratación y emisión
                  de comprobantes de pago es estrictamente directa entre el comerciante y el prestador. La inclusión en
                  este directorio no constituye certificación ni aval municipal oficial por parte de la Unidad de ITSE de
                  la Municipalidad Provincial de Huancayo.
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <Link
                href="/autoevaluacion/nueva"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <Wrench className="h-4 w-4" />
                Volver a mi autoevaluación
              </Link>
            </div>
          </aside>

          {/* Banner de afiliación de nuevos prestadores */}
          <aside className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Store className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  ¿Eres profesional habilitado (CIP/CAP) o empresa de seguridad en Huancayo?
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Regístrate gratuitamente en el directorio cívico para brindar soporte técnico a comerciantes locales.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalAfiliacionAbierto(true)}
              className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-900 shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <span>Postular al directorio</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </aside>
        </div>
      </div>

      <ModalContactoProveedor
        isOpen={aliadoSeleccionado !== null}
        onClose={() => setAliadoSeleccionado(null)}
        aliado={aliadoSeleccionado}
        distritoSeleccionado={filtroDistrito}
      />

      <ModalAfiliacion
        isOpen={modalAfiliacionAbierto}
        onClose={() => setModalAfiliacionAbierto(false)}
        whatsapp={WHATSAPP_ALIADOS_NUMERO}
      />
    </>
  );
}
