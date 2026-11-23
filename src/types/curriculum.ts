export type AsignaturaId =
  | 'matematicas'
  | 'lengua_castellana'
  | 'geografia_historia'
  | 'biologia_geologia'
  | 'ingles'
  | 'educacion_plastica'
  | 'musica'
  | 'tecnologia_digitalizacion'
  | 'educacion_fisica'
  | 'segunda_lengua_extranjera';

export interface AsignaturaCurricular {
  id: AsignaturaId;
  nombre: string;
  nombreCorto: string;
  colorBadge: string;
  competenciasClave: string[];
  enfoqueDecreto30: string;
  ejemplosSaberesBasicos: string[];
}
