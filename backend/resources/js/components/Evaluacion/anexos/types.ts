import type {
  AutoevaluacionDatos,
  ClasificacionDatos,
  CondicionItem,
  ConteoDatos,
  RiesgoTramiteDatos,
  TitularDatos,
} from '@/pages/Evaluacion/AnexoOficial';

export interface FormatoAnexoProps {
  readonly autoevaluacion: AutoevaluacionDatos;
  readonly titular?: TitularDatos;
  readonly riesgoTramite?: RiesgoTramiteDatos;
  readonly clasificacion?: ClasificacionDatos;
  readonly condiciones?: readonly CondicionItem[];
  readonly conteo?: ConteoDatos;
  readonly codigoDocumento?: string;
  readonly fechaEmision?: string;
}
