import { type FormEvent, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Store,
  User as UserIcon,
} from 'lucide-react';
import type { SharedData } from '@/types';

export interface UsuarioContribuyente {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly telefono?: string | null;
  readonly razon_social?: string | null;
  readonly nombre_comercial?: string | null;
  readonly direccion_fiscal?: string | null;
}

export interface PerfilUsuarioProps {
  readonly user: UsuarioContribuyente;
}

interface FormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly error?: string;
  readonly type?: string;
  readonly placeholder?: string;
  readonly icono: React.ComponentType<{ className?: string }>;
  readonly onChange: (valor: string) => void;
  readonly disabled?: boolean;
  readonly autoComplete?: string;
}

function FormField({
  id,
  label,
  value,
  error,
  type = 'text',
  placeholder,
  icono: Icono,
  onChange,
  disabled = false,
  autoComplete,
}: Readonly<FormFieldProps>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <Icono className="h-4 w-4" />
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export default function PerfilUsuario({ user }: Readonly<PerfilUsuarioProps>) {
  const page = usePage<SharedData>();
  const flash = page.props.flash;
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const { data, setData, put, processing, errors, reset } = useForm({
    name: user.name ?? '',
    email: user.email ?? '',
    telefono: user.telefono ?? '',
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMensajeExito(null);

    put(route('perfil.update'), {
      preserveScroll: true,
      onSuccess: () => {
        reset('current_password', 'password', 'password_confirmation');
        setMensajeExito('Tu información personal y credenciales se han actualizado correctamente.');
      },
    });
  };

  const alertaVisible = mensajeExito ?? flash?.success ?? null;

  return (
    <>
      <Head title="Mi Cuenta — CheckITSE" />

      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Contribuyente Registrado
              </span>
            </div>
            <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900">
              Perfil del Titular
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Administra tu información personal de contacto y credenciales de acceso seguro.
            </p>
          </div>

          <div>
            <Link
              href={route('dashboard')}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
            >
              Volver al Panel
            </Link>
          </div>
        </div>

        {/* Notificación de Éxito */}
        {alertaVisible && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-2xs backdrop-blur-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <h4 className="text-xs font-bold text-emerald-950">Actualización exitosa</h4>
              <p className="mt-0.5 text-xs text-emerald-800">{alertaVisible}</p>
            </div>
          </div>
        )}

        {/* Nota Informativa sobre Locales Comerciales */}
        <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-emerald-950 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Store className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-emerald-900">
              ¿Deseas editar el RUC, nombre comercial o dirección de un local?
            </p>
            <p className="mt-0.5 text-emerald-800">
              Como contribuyente puedes gestionar múltiples sucursales o establecimientos. Los datos comerciales, giro, área y condiciones físicas de cada local se configuran y evalúan de manera individual desde tu{' '}
              <Link
                href={route('dashboard')}
                className="font-bold text-emerald-900 underline underline-offset-2 hover:text-emerald-950"
              >
                Panel Ciudadano
              </Link>.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Bloque 1: Datos Personales y de Contacto */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Datos Personales del Titular</h2>
                <p className="text-xs text-slate-400">Información para notificaciones y contacto técnico</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  id="name"
                  label="Nombre Completo del Titular *"
                  value={data.name}
                  error={errors.name}
                  placeholder="Ej. Juan Pérez Ramos"
                  icono={UserIcon}
                  autoComplete="name"
                  onChange={(val) => setData('name', val)}
                />
              </div>

              <FormField
                id="email"
                label="Correo Electrónico de Notificaciones *"
                type="email"
                value={data.email}
                error={errors.email}
                placeholder="correo@ejemplo.com"
                icono={Mail}
                autoComplete="email"
                onChange={(val) => setData('email', val)}
              />

              <FormField
                id="telefono"
                label="Teléfono Celular / WhatsApp"
                type="tel"
                value={data.telefono}
                error={errors.telefono}
                placeholder="964 123 456"
                icono={Phone}
                autoComplete="tel"
                onChange={(val) => setData('telefono', val)}
              />
            </div>
          </div>

          {/* Bloque 2: Seguridad y Contraseña */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Seguridad y Credenciales de Acceso</h2>
                <p className="text-xs text-slate-400">Opcional: completa estos campos solo si deseas cambiar tu contraseña</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <FormField
                id="current_password"
                label="Contraseña Actual"
                type="password"
                value={data.current_password}
                error={errors.current_password}
                placeholder="••••••••"
                icono={Lock}
                autoComplete="current-password"
                onChange={(val) => setData('current_password', val)}
              />

              <FormField
                id="password"
                label="Nueva Contraseña"
                type="password"
                value={data.password}
                error={errors.password}
                placeholder="Mínimo 8 caracteres"
                icono={KeyRound}
                autoComplete="new-password"
                onChange={(val) => setData('password', val)}
              />

              <FormField
                id="password_confirmation"
                label="Confirmar Nueva Contraseña"
                type="password"
                value={data.password_confirmation}
                error={errors.password_confirmation}
                placeholder="Repite la contraseña"
                icono={KeyRound}
                autoComplete="new-password"
                onChange={(val) => setData('password_confirmation', val)}
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href={route('dashboard')}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{processing ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
