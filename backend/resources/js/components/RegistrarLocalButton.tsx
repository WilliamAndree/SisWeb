import { Link } from '@inertiajs/react';
import React from 'react';

interface RegistrarLocalButtonProps {
    readonly variant?: 'compact' | 'large';
    readonly className?: string;
    readonly onClick?: () => void;
}

export const RegistrarLocalButton: React.FC<RegistrarLocalButtonProps> = ({ variant = 'compact', className = '', onClick }) => {
    const estiloBase =
        'inline-flex min-h-[44px] items-center justify-center font-bold text-white bg-primary hover:bg-primary-700 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2';

    const estiloVariante =
        variant === 'large' ? 'px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm rounded-2xl' : 'px-3 py-2 text-xs rounded-xl shrink-0';

    return (
        <Link href={route('autoevaluacion.nueva')} onClick={onClick} className={`${estiloBase} ${estiloVariante} ${className}`.trim()}>
            Revisar mi local
        </Link>
    );
};

export default RegistrarLocalButton;
