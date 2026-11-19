<?php

namespace App\Services\Monitoreo;

use RuntimeException;
use ZipArchive;

/**
 * Exporta la matriz de monitoreo a:
 *  - Excel (.xlsx) con tres hojas: Matriz, Resumen e Historial (semáforo con colores).
 *  - Markdown (.md), legible directamente en GitHub.
 *  - Historial (.csv), al que cada ejecución agrega una fila por proceso.
 *
 * El .xlsx se arma con ZipArchive (Office Open XML), sin librerías externas.
 */
class ExportadorMatriz
{
    private const ENCABEZADOS = [
        'Nivel', 'Código', 'Proceso', 'Responsable', 'Pruebas', 'Aprobadas', 'Fallidas', '% Éxito',
        'Cobertura %', 'Bugs', 'Vulnerabilidades', 'Code smells', 'Estado', 'Observación',
    ];

    private const COLUMNAS_HISTORIAL = ['fecha', 'commit', 'codigo', 'proceso', 'estado', 'pruebas', 'fallidas', 'cobertura', 'bugs', 'vulnerabilidades', 'code_smells'];

    /** Estilos definidos en estilos(): índices de cellXfs. */
    private const E_NORMAL = 2;

    private const E_ENCABEZADO = 1;

    private const E_TITULO = 6;

    private const E_SUBTITULO = 7;

    private const E_ESTADO = ['verde' => 3, 'amarillo' => 4, 'rojo' => 5];

    private const ETIQUETA_ESTADO = ['verde' => 'Verde', 'amarillo' => 'Amarillo', 'rojo' => 'Rojo'];

    private const ICONO_ESTADO = ['verde' => '🟢', 'amarillo' => '🟡', 'rojo' => '🔴'];

    /**
     * @param  array{filas: list<array<string, mixed>>, niveles: list<array<string, mixed>>, global: array<string, mixed>, sin_proceso: list<string>}  $matriz
     * @param  array{fecha: string, commit: string}  $meta
     * @return array{xlsx: string, md: string, csv: string}
     */
    public function exportar(array $matriz, array $meta, string $carpeta): array
    {
        if (! is_dir($carpeta) && ! mkdir($carpeta, 0775, true) && ! is_dir($carpeta)) {
            throw new RuntimeException("No se pudo crear la carpeta {$carpeta}");
        }

        $csv = $carpeta.DIRECTORY_SEPARATOR.'historial.csv';
        $this->agregarHistorial($csv, $matriz['filas'], $meta);

        $xlsx = $carpeta.DIRECTORY_SEPARATOR.'matriz-monitoreo.xlsx';
        $this->escribirXlsx($xlsx, $matriz, $meta, $this->leerHistorial($csv));

        $md = $carpeta.DIRECTORY_SEPARATOR.'matriz-monitoreo.md';
        file_put_contents($md, $this->markdown($matriz, $meta));

        return ['xlsx' => $xlsx, 'md' => $md, 'csv' => $csv];
    }

    /**
     * @param  list<array<string, mixed>>  $filas
     * @param  array{fecha: string, commit: string}  $meta
     */
    private function agregarHistorial(string $ruta, array $filas, array $meta): void
    {
        $nuevo = ! is_file($ruta);
        $archivo = fopen($ruta, 'ab');
        if ($archivo === false) {
            throw new RuntimeException("No se pudo escribir {$ruta}");
        }
        if ($nuevo) {
            fputcsv($archivo, self::COLUMNAS_HISTORIAL, ',', '"', '');
        }
        foreach ($filas as $fila) {
            fputcsv($archivo, [
                $meta['fecha'], $meta['commit'], $fila['codigo'], $fila['proceso'], $fila['estado'], $fila['pruebas'],
                $fila['fallidas'], $fila['cobertura'] ?? '', $fila['bugs'] ?? '', $fila['vulnerabilidades'] ?? '', $fila['code_smells'] ?? '',
            ], ',', '"', '');
        }
        fclose($archivo);
    }

    /**
     * @return list<list<string>>
     */
    private function leerHistorial(string $ruta): array
    {
        $filas = [];
        $archivo = fopen($ruta, 'rb');
        while ($archivo !== false && ($fila = fgetcsv($archivo, null, ',', '"', '')) !== false) {
            $filas[] = array_map('strval', $fila);
        }
        if ($archivo !== false) {
            fclose($archivo);
        }

        return $filas;
    }

    /**
     * @param  array{filas: list<array<string, mixed>>, niveles: list<array<string, mixed>>, global: array<string, mixed>, sin_proceso: list<string>}  $matriz
     * @param  array{fecha: string, commit: string}  $meta
     * @param  list<list<string>>  $historial
     */
    private function escribirXlsx(string $ruta, array $matriz, array $meta, array $historial): void
    {
        $hojas = [
            'Matriz' => $this->hojaMatriz($matriz, $meta),
            'Resumen' => $this->hojaResumen($matriz, $meta),
            'Historial' => $this->hojaHistorial($historial),
        ];

        if (is_file($ruta)) {
            unlink($ruta);
        }
        $zip = new ZipArchive;
        if ($zip->open($ruta, ZipArchive::CREATE) !== true) {
            throw new RuntimeException("No se pudo crear {$ruta}");
        }

        $nombres = array_keys($hojas);
        $zip->addFromString('[Content_Types].xml', $this->tiposDeContenido(count($hojas)));
        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
        $zip->addFromString('xl/workbook.xml', $this->libro($nombres));
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->relacionesLibro(count($hojas)));
        $zip->addFromString('xl/styles.xml', $this->estilos());
        foreach (array_values($hojas) as $i => $hoja) {
            $zip->addFromString('xl/worksheets/sheet'.($i + 1).'.xml', $hoja);
        }
        $zip->close();
    }

    /**
     * @param  array{filas: list<array<string, mixed>>, niveles: list<array<string, mixed>>, global: array<string, mixed>, sin_proceso: list<string>}  $matriz
     * @param  array{fecha: string, commit: string}  $meta
     */
    private function hojaMatriz(array $matriz, array $meta): string
    {
        $g = $matriz['global'];
        $filas = [
            [['Matriz de control y monitoreo · CheckITSE Huancayo', self::E_TITULO]],
            [["Generada: {$meta['fecha']} · commit {$meta['commit']} · Quality Gate: {$g['quality_gate']}", self::E_SUBTITULO]],
            [],
            array_map(fn (string $t): array => [$t, self::E_ENCABEZADO], self::ENCABEZADOS),
        ];

        foreach ($matriz['filas'] as $f) {
            $filas[] = [
                [$f['nivel'], self::E_NORMAL], [$f['codigo'], self::E_NORMAL], [$f['proceso'], self::E_NORMAL], [$f['responsable'], self::E_NORMAL],
                [$f['pruebas'], self::E_NORMAL], [$f['aprobadas'], self::E_NORMAL], [$f['fallidas'], self::E_NORMAL], [$f['exito'], self::E_NORMAL],
                [$f['cobertura'] ?? 's/d', self::E_NORMAL], [$f['bugs'] ?? 's/d', self::E_NORMAL], [$f['vulnerabilidades'] ?? 's/d', self::E_NORMAL],
                [$f['code_smells'] ?? 's/d', self::E_NORMAL], [self::ETIQUETA_ESTADO[$f['estado']], self::E_ESTADO[$f['estado']]], [$f['observacion'], self::E_NORMAL],
            ];
        }

        return $this->hoja($filas, [13, 8, 30, 24, 10, 11, 10, 10, 12, 8, 15, 13, 11, 60], 4);
    }

    /**
     * @param  array{filas: list<array<string, mixed>>, niveles: list<array<string, mixed>>, global: array<string, mixed>, sin_proceso: list<string>}  $matriz
     * @param  array{fecha: string, commit: string}  $meta
     */
    private function hojaResumen(array $matriz, array $meta): string
    {
        $g = $matriz['global'];
        $filas = [
            [['Resumen del control y monitoreo', self::E_TITULO]],
            [["Generada: {$meta['fecha']} · commit {$meta['commit']}", self::E_SUBTITULO]],
            [],
            [['Indicador global', self::E_ENCABEZADO], ['Valor', self::E_ENCABEZADO]],
            [['Pruebas ejecutadas', self::E_NORMAL], [$g['pruebas'], self::E_NORMAL]],
            [['Pruebas fallidas', self::E_NORMAL], [$g['fallidas'], self::E_NORMAL]],
            [['% de éxito de pruebas', self::E_NORMAL], [$g['exito'], self::E_NORMAL]],
            [['Cobertura de la lógica (%)', self::E_NORMAL], [$g['cobertura'] ?? 's/d', self::E_NORMAL]],
            [['Quality Gate (SonarQube)', self::E_NORMAL], [$g['quality_gate'], self::E_NORMAL]],
            [['Procesos en verde / amarillo / rojo', self::E_NORMAL], ["{$g['procesos_verde']} / {$g['procesos_amarillo']} / {$g['procesos_rojo']}", self::E_NORMAL]],
            [['Cumplimiento (% de procesos en verde)', self::E_NORMAL], [$g['cumplimiento'], self::E_NORMAL]],
            [],
            array_map(fn (string $t): array => [$t, self::E_ENCABEZADO], ['Nivel', 'Procesos', 'Verde', 'Amarillo', 'Rojo', 'Cumplimiento %']),
        ];
        foreach ($matriz['niveles'] as $n) {
            $filas[] = [
                [$n['nivel'], self::E_NORMAL], [$n['procesos'], self::E_NORMAL], [$n['verde'], self::E_ESTADO['verde']],
                [$n['amarillo'], self::E_ESTADO['amarillo']], [$n['rojo'], self::E_ESTADO['rojo']], [$n['cumplimiento'], self::E_NORMAL],
            ];
        }

        $filas[] = [];
        $filas[] = [['Regla del semáforo', self::E_ENCABEZADO], ['Significado', self::E_ENCABEZADO]];
        $filas[] = [['Verde', self::E_ESTADO['verde']], ['Todas sus pruebas pasan, cobertura ≥ mínimo y sin bugs ni vulnerabilidades', self::E_NORMAL]];
        $filas[] = [['Amarillo', self::E_ESTADO['amarillo']], ['Las pruebas pasan, pero la cobertura está bajo el mínimo o falta ejecutar alguna prueba', self::E_NORMAL]];
        $filas[] = [['Rojo', self::E_ESTADO['rojo']], ['Alguna prueba falla, no hay pruebas o hay bugs/vulnerabilidades abiertos', self::E_NORMAL]];

        if ($matriz['sin_proceso'] !== []) {
            $filas[] = [];
            $filas[] = [['Pruebas sin proceso asignado', self::E_ENCABEZADO]];
            foreach ($matriz['sin_proceso'] as $prueba) {
                $filas[] = [[$prueba, self::E_NORMAL]];
            }
        }

        return $this->hoja($filas, [40, 70, 10, 11, 10, 15]);
    }

    /**
     * @param  list<list<string>>  $historial
     */
    private function hojaHistorial(array $historial): string
    {
        $filas = [];
        foreach ($historial as $i => $fila) {
            if ($i === 0) {
                $filas[] = array_map(fn (string $t): array => [$t, self::E_ENCABEZADO], $fila);

                continue;
            }
            $filas[] = array_map(
                fn (string $valor, int $col): array => [is_numeric($valor) ? $valor + 0 : $valor, $col === 4 ? (self::E_ESTADO[$valor] ?? self::E_NORMAL) : self::E_NORMAL],
                $fila,
                array_keys($fila),
            );
        }

        return $this->hoja($filas, [20, 10, 8, 30, 10, 9, 9, 10, 7, 15, 12], 1);
    }

    /**
     * @param  list<list<array{0: mixed, 1: int}>>  $filas
     * @param  list<int>  $anchos
     */
    private function hoja(array $filas, array $anchos, int $filaFija = 0): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
        if ($filaFija > 0) {
            $xml .= '<sheetViews><sheetView workbookViewId="0"><pane ySplit="'.$filaFija.'" topLeftCell="A'.($filaFija + 1).'" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
        }
        $xml .= '<cols>';
        foreach ($anchos as $i => $ancho) {
            $xml .= '<col min="'.($i + 1).'" max="'.($i + 1).'" width="'.$ancho.'" customWidth="1"/>';
        }
        $xml .= '</cols><sheetData>';
        foreach ($filas as $r => $celdas) {
            $xml .= '<row r="'.($r + 1).'">';
            foreach ($celdas as $c => [$valor, $estilo]) {
                $xml .= $this->celda($this->columna($c).($r + 1), $valor, $estilo);
            }
            $xml .= '</row>';
        }

        return $xml.'</sheetData></worksheet>';
    }

    private function celda(string $ref, mixed $valor, int $estilo): string
    {
        if (is_int($valor) || is_float($valor)) {
            return '<c r="'.$ref.'" s="'.$estilo.'"><v>'.$valor.'</v></c>';
        }

        return '<c r="'.$ref.'" s="'.$estilo.'" t="inlineStr"><is><t xml:space="preserve">'.htmlspecialchars((string) $valor, ENT_XML1 | ENT_QUOTES, 'UTF-8').'</t></is></c>';
    }

    private function columna(int $indice): string
    {
        $letras = '';
        for ($n = $indice + 1; $n > 0; $n = intdiv($n - 1, 26)) {
            $letras = chr(65 + ($n - 1) % 26).$letras;
        }

        return $letras;
    }

    private function tiposDeContenido(int $hojas): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
        for ($i = 1; $i <= $hojas; $i++) {
            $xml .= '<Override PartName="/xl/worksheets/sheet'.$i.'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }

        return $xml.'</Types>';
    }

    /**
     * @param  list<string>  $nombres
     */
    private function libro(array $nombres): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
        foreach ($nombres as $i => $nombre) {
            $xml .= '<sheet name="'.$nombre.'" sheetId="'.($i + 1).'" r:id="rId'.($i + 1).'"/>';
        }

        return $xml.'</sheets></workbook>';
    }

    private function relacionesLibro(int $hojas): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        for ($i = 1; $i <= $hojas; $i++) {
            $xml .= '<Relationship Id="rId'.$i.'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'.$i.'.xml"/>';
        }

        return $xml.'<Relationship Id="rId'.($hojas + 1).'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    }

    /**
     * cellXfs: 0 base · 1 encabezado · 2 normal · 3 verde · 4 amarillo · 5 rojo · 6 título · 7 subtítulo.
     */
    private function estilos(): string
    {
        $borde = 'borderId="1" applyBorder="1"';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<fonts count="5">'
            .'<font><sz val="11"/><name val="Calibri"/></font>'
            .'<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
            .'<font><b/><sz val="11"/><name val="Calibri"/></font>'
            .'<font><b/><sz val="16"/><color rgb="FF17133A"/><name val="Calibri"/></font>'
            .'<font><i/><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/></font>'
            .'</fonts>'
            .'<fills count="6">'
            .'<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FF17133A"/></patternFill></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/></patternFill></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FFFFEB9C"/></patternFill></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/></patternFill></fill>'
            .'</fills>'
            .'<borders count="2"><border/><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom></border></borders>'
            .'<cellStyleXfs count="1"><xf/></cellStyleXfs>'
            .'<cellXfs count="8">'
            .'<xf/>'
            .'<xf fontId="1" fillId="2" '.$borde.' applyFont="1" applyFill="1"><alignment wrapText="1" vertical="center"/></xf>'
            .'<xf '.$borde.'><alignment wrapText="1" vertical="top"/></xf>'
            .'<xf fontId="2" fillId="3" '.$borde.' applyFont="1" applyFill="1"><alignment horizontal="center" vertical="top"/></xf>'
            .'<xf fontId="2" fillId="4" '.$borde.' applyFont="1" applyFill="1"><alignment horizontal="center" vertical="top"/></xf>'
            .'<xf fontId="2" fillId="5" '.$borde.' applyFont="1" applyFill="1"><alignment horizontal="center" vertical="top"/></xf>'
            .'<xf fontId="3" applyFont="1"/>'
            .'<xf fontId="4" applyFont="1"/>'
            .'</cellXfs></styleSheet>';
    }

    /**
     * @param  array{filas: list<array<string, mixed>>, niveles: list<array<string, mixed>>, global: array<string, mixed>, sin_proceso: list<string>}  $matriz
     * @param  array{fecha: string, commit: string}  $meta
     */
    private function markdown(array $matriz, array $meta): string
    {
        $g = $matriz['global'];
        $sd = fn (mixed $v): string => $v === null ? 's/d' : (string) $v;

        $md = "# Matriz de control y monitoreo\n\n"
            ."> Generada automáticamente el **{$meta['fecha']}** (commit `{$meta['commit']}`). No editar a mano: se regenera con `scripts/monitoreo.ps1`.\n\n"
            ."## Resumen\n\n"
            ."| Indicador | Valor |\n| --- | --- |\n"
            ."| Pruebas ejecutadas | {$g['pruebas']} ({$g['fallidas']} fallidas, {$g['exito']} % de éxito) |\n"
            .'| Cobertura de la lógica | '.$sd($g['cobertura'])." % |\n"
            ."| Quality Gate (SonarQube) | {$g['quality_gate']} |\n"
            ."| Procesos 🟢 / 🟡 / 🔴 | {$g['procesos_verde']} / {$g['procesos_amarillo']} / {$g['procesos_rojo']} |\n"
            ."| Cumplimiento | **{$g['cumplimiento']} %** de procesos en verde |\n\n"
            ."## Matriz (procesos × indicadores)\n\n"
            ."| Nivel | Código | Proceso | Pruebas | Fallidas | % Éxito | Cobertura % | Bugs | Vuln. | Code smells | Estado | Observación |\n"
            ."| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: | --- |\n";

        foreach ($matriz['filas'] as $f) {
            $md .= "| {$f['nivel']} | {$f['codigo']} | {$f['proceso']} | {$f['pruebas']} | {$f['fallidas']} | {$f['exito']} | "
                .$sd($f['cobertura']).' | '.$sd($f['bugs']).' | '.$sd($f['vulnerabilidades']).' | '.$sd($f['code_smells']).' | '
                .self::ICONO_ESTADO[$f['estado']].' '.self::ETIQUETA_ESTADO[$f['estado']]." | {$f['observacion']} |\n";
        }

        $md .= "\n## Por nivel\n\n| Nivel | Procesos | 🟢 | 🟡 | 🔴 | Cumplimiento % |\n| --- | ---: | ---: | ---: | ---: | ---: |\n";
        foreach ($matriz['niveles'] as $n) {
            $md .= "| {$n['nivel']} | {$n['procesos']} | {$n['verde']} | {$n['amarillo']} | {$n['rojo']} | {$n['cumplimiento']} |\n";
        }

        $md .= "\n## Regla del semáforo\n\n"
            ."- 🟢 **Verde:** todas sus pruebas pasan, la cobertura alcanza el mínimo y no hay bugs ni vulnerabilidades.\n"
            ."- 🟡 **Amarillo:** las pruebas pasan, pero la cobertura está bajo el mínimo o falta ejecutar alguna prueba declarada.\n"
            ."- 🔴 **Rojo:** alguna prueba falla, no hay pruebas o hay bugs/vulnerabilidades abiertos.\n\n"
            ."`s/d` = sin dato (por ejemplo, si no se envió la cobertura o SonarQube no estaba disponible).\n";

        if ($matriz['sin_proceso'] !== []) {
            $md .= "\n## Pruebas sin proceso asignado\n\nSe ejecutan, pero no pertenecen a los 13 procesos del alcance: "
                .implode(', ', array_map(fn (string $p): string => "`{$p}`", $matriz['sin_proceso'])).".\n";
        }

        return $md;
    }
}
