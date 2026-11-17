<?php

namespace App\Services\Espacio\Geometria;

class GeometriaPuntoSegmento
{
    public const TOLERANCIA_METROS_DEFAULT = 0.20;

    /**
     * Calcula la distancia ortogonal mínima de un punto P a un segmento cerrado [A, B].
     *
     * @param  array{x: float|int, y: float|int}  $p  Punto de consulta
     * @param  array{x: float|int, y: float|int}  $a  Inicio del segmento
     * @param  array{x: float|int, y: float|int}  $b  Fin del segmento
     * @return float Distancia métrica euclidiana en metros
     */
    public static function distanciaPuntoASegmento(array $p, array $a, array $b, bool $redondear = true): float
    {
        foreach ([$p, $a, $b] as $punto) {
            foreach (['x', 'y'] as $eje) {
                if (! isset($punto[$eje]) || ! is_numeric($punto[$eje]) || ! is_finite((float) $punto[$eje])) {
                    throw new \InvalidArgumentException('Las coordenadas del punto deben ser numéricas y finitas.');
                }
            }
        }
        $px = (float) $p['x'];
        $py = (float) $p['y'];
        $ax = (float) $a['x'];
        $ay = (float) $a['y'];
        $bx = (float) $b['x'];
        $by = (float) $b['y'];

        $dx = $bx - $ax;
        $dy = $by - $ay;

        $longitudCuadrada = ($dx * $dx) + ($dy * $dy);

        // Caso límite: Segmento de longitud cero (punto A y B coinciden)
        if ($longitudCuadrada <= 1e-9) {
            $distancia = hypot($px - $ax, $py - $ay);

            return $redondear ? round($distancia, 4) : $distancia;
        }

        // Factor de proyección escalar t sobre el segmento [0, 1]
        $t = (($px - $ax) * $dx + ($py - $ay) * $dy) / $longitudCuadrada;

        // Limitar t al intervalo cerrado [0, 1]
        if ($t < 0.0) {
            $t = 0.0;
        } elseif ($t > 1.0) {
            $t = 1.0;
        }

        // Coordenadas del punto más cercano sobre el segmento
        $cercanoX = $ax + ($t * $dx);
        $cercanoY = $ay + ($t * $dy);

        $distancia = sqrt((($px - $cercanoX) ** 2) + (($py - $cercanoY) ** 2));

        return $redondear ? round($distancia, 4) : $distancia;
    }

    /**
     * Calcula la distancia mínima de un punto P al perímetro de un polígono cerrado.
     *
     * @param  array{x: float|int, y: float|int}  $p
     * @param  list<array{x: float|int, y: float|int}>  $vertices
     */
    public static function distanciaPuntoAPolígono(array $p, array $vertices, bool $redondear = true): float
    {
        $n = count($vertices);
        if ($n < 2) {
            if ($n === 1) {
                return self::distanciaPuntoASegmento($p, $vertices[0], $vertices[0], $redondear);
            }

            return INF;
        }

        $distanciaMinima = INF;

        for ($i = 0; $i < $n; $i++) {
            $a = $vertices[$i];
            $b = $vertices[($i + 1) % $n];

            $dist = self::distanciaPuntoASegmento($p, $a, $b, $redondear);
            if ($dist < $distanciaMinima) {
                $distanciaMinima = $dist;
            }
        }

        return $distanciaMinima;
    }

    /**
     * Obtiene los vértices de un ambiente (ya sea poligonal o rectangular simple).
     *
     * @param  array<string, mixed>  $ambiente
     * @return list<array{x: float, y: float}>
     */
    public static function obtenerVerticesAmbiente(array $ambiente): array
    {
        $verticesRaw = $ambiente['vertices_poligono'] ?? null;
        if (! empty($verticesRaw) && is_array($verticesRaw) && count($verticesRaw) >= 3) {
            return array_map(fn ($v) => [
                'x' => round((float) ($v['x'] ?? 0), 2),
                'y' => round((float) ($v['y'] ?? 0), 2),
            ], $verticesRaw);
        }

        $posX = round((float) ($ambiente['posicion_x'] ?? 0.0), 2);
        $posY = round((float) ($ambiente['posicion_y'] ?? 0.0), 2);
        $ancho = round((float) ($ambiente['ancho_metros'] ?? 4.0), 2);
        $largo = round((float) ($ambiente['largo_metros'] ?? 4.0), 2);

        return [
            ['x' => $posX, 'y' => $posY],
            ['x' => round($posX + $ancho, 2), 'y' => $posY],
            ['x' => round($posX + $ancho, 2), 'y' => round($posY + $largo, 2)],
            ['x' => $posX, 'y' => round($posY + $largo, 2)],
        ];
    }

    /**
     * Determina si un punto se ubica dentro de la tolerancia de proximidad del perímetro de un ambiente.
     *
     * @param  array{x: float|int, y: float|int}  $p
     * @param  array<string, mixed>  $ambiente
     */
    public static function estaProximoAPerimetro(
        array $p,
        array $ambiente,
        float $tolerancia = self::TOLERANCIA_METROS_DEFAULT
    ): bool {
        $vertices = self::obtenerVerticesAmbiente($ambiente);
        $distancia = self::distanciaPuntoAPolígono($p, $vertices, false);

        $escala = max(1.0, abs((float) $p['x']), abs((float) $p['y']));
        foreach ($vertices as $vertice) {
            $escala = max($escala, abs($vertice['x']), abs($vertice['y']));
        }

        return $distancia <= $tolerancia || abs($distancia - $tolerancia) <= 8 * PHP_FLOAT_EPSILON * $escala;
    }
}
