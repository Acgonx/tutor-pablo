import type { FormaGeometrica, VisualSpec } from '../../types/studyMaterial';

interface VisualFigureRendererProps {
  spec: VisualSpec;
  showSolution?: boolean;
  className?: string;
}

function sanitizeSvgContent(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function FraccionBarraSvg({
  denominador,
  numerador,
  filas = 1,
  shaded,
}: {
  denominador: number;
  numerador: number;
  filas?: number;
  shaded: boolean;
}) {
  const safeDen = Math.max(1, Math.min(24, Math.round(denominador)));
  const safeRows = Math.max(1, Math.min(4, Math.round(filas)));
  const cols = Math.ceil(safeDen / safeRows);
  const safeNum = shaded ? Math.max(0, Math.min(safeDen, Math.round(numerador))) : 0;

  const cellW = Math.min(46, Math.floor(320 / Math.max(1, cols)));
  const cellH = safeRows > 1 ? 36 : 44;
  const width = cols * cellW + 16;
  const height = safeRows * cellH + 16;

  const cells: Array<{ x: number; y: number; filled: boolean; idx: number }> = [];
  for (let i = 0; i < safeDen; i += 1) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    cells.push({
      x: 8 + c * cellW,
      y: 8 + r * cellH,
      filled: i < safeNum,
      idx: i,
    });
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto max-h-40 w-auto max-w-full"
      role="img"
      aria-label={`Barra de fracción dividida en ${safeDen} partes`}
    >
      {cells.map((cell) => (
        <rect
          key={cell.idx}
          x={cell.x}
          y={cell.y}
          width={cellW}
          height={cellH}
          fill={cell.filled ? '#818cf8' : '#ffffff'}
          stroke="#1e293b"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}

function FraccionCirculoSvg({
  denominador,
  numerador,
  shaded,
}: {
  denominador: number;
  numerador: number;
  shaded: boolean;
}) {
  const safeDen = Math.max(2, Math.min(24, Math.round(denominador)));
  const safeNum = shaded ? Math.max(0, Math.min(safeDen, Math.round(numerador))) : 0;
  const cx = 90;
  const cy = 90;
  const r = 74;

  const wedges = Array.from({ length: safeDen }).map((_, idx) => {
    const startAngle = (idx * 2 * Math.PI) / safeDen - Math.PI / 2;
    const endAngle = ((idx + 1) * 2 * Math.PI) / safeDen - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = 2 * Math.PI / safeDen > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    return (
      <path
        key={idx}
        d={d}
        fill={idx < safeNum ? '#818cf8' : '#ffffff'}
        stroke="#1e293b"
        strokeWidth={2}
      />
    );
  });

  return (
    <svg
      viewBox="0 0 180 180"
      className="mx-auto h-40 w-40"
      role="img"
      aria-label={`Círculo de fracción dividido en ${safeDen} sectores`}
    >
      {wedges}
    </svg>
  );
}

function RectaNumericaSvg({
  min,
  max,
  paso,
  marcas = [],
  showSolution,
}: {
  min: number;
  max: number;
  paso: number;
  marcas?: Array<{ valor: number; etiqueta?: string }>;
  showSolution: boolean;
}) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 5;
  const safePaso = Number.isFinite(paso) && paso > 0 ? paso : 1;

  const ticks: number[] = [];
  const maxTicks = 24;
  for (let v = safeMin; v <= safeMax + safePaso * 0.001 && ticks.length < maxTicks; v += safePaso) {
    ticks.push(Number(v.toFixed(2)));
  }

  const width = 420;
  const padX = 28;
  const span = width - padX * 2;
  const toX = (val: number) => padX + ((val - safeMin) / (safeMax - safeMin)) * span;

  return (
    <svg
      viewBox={`0 0 ${width} 92`}
      className="mx-auto w-full max-w-md"
      role="img"
      aria-label={`Recta numérica de ${safeMin} a ${safeMax}`}
    >
      <line x1={padX - 10} y1={46} x2={width - padX + 10} y2={46} stroke="#0f172a" strokeWidth={2.5} />
      <polygon points={`${width - padX + 16},46 ${width - padX + 6},41 ${width - padX + 6},51`} fill="#0f172a" />
      <polygon points={`${padX - 16},46 ${padX - 6},41 ${padX - 6},51`} fill="#0f172a" />

      {ticks.map((t) => {
        const x = toX(t);
        return (
          <g key={t}>
            <line x1={x} y1={38} x2={x} y2={54} stroke="#334155" strokeWidth={1.8} />
            <text x={x} y={72} textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155">
              {t}
            </text>
          </g>
        );
      })}

      {showSolution &&
        marcas.map((m, idx) => {
          const x = toX(m.valor);
          return (
            <g key={idx}>
              <circle cx={x} cy={46} r={5.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />
              {m.etiqueta && (
                <text x={x} y={24} textAnchor="middle" fontSize="11" fontWeight="700" fill="#4338ca">
                  {m.etiqueta}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}

function FiguraGeometricaSvg({
  forma = 'rectangulo',
  medidas = [],
}: {
  forma?: FormaGeometrica;
  medidas?: Array<{ etiqueta: string; valor: string }>;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 240 150"
        className="mx-auto h-36 w-56"
        role="img"
        aria-label={`Figura geométrica: ${forma}`}
      >
        {forma === 'cuadrado' && (
          <rect x="65" y="20" width="110" height="110" fill="#eef2ff" stroke="#1e293b" strokeWidth="2.5" />
        )}
        {forma === 'rectangulo' && (
          <rect x="35" y="30" width="170" height="90" fill="#eef2ff" stroke="#1e293b" strokeWidth="2.5" />
        )}
        {forma === 'triangulo' && (
          <>
            <polygon points="120,20 35,125 205,125" fill="#eef2ff" stroke="#1e293b" strokeWidth="2.5" />
            <line x1="120" y1="20" x2="120" y2="125" stroke="#6366f1" strokeWidth="1.8" strokeDasharray="4 3" />
          </>
        )}
        {forma === 'circulo' && (
          <>
            <circle cx="120" cy="75" r="56" fill="#eef2ff" stroke="#1e293b" strokeWidth="2.5" />
            <line x1="120" y1="75" x2="176" y2="75" stroke="#4f46e5" strokeWidth="2" />
            <circle cx="120" cy="75" r="3" fill="#1e293b" />
          </>
        )}
        {forma === 'rombo' && (
          <>
            <polygon points="120,16 200,75 120,134 40,75" fill="#eef2ff" stroke="#1e293b" strokeWidth="2.5" />
            <line x1="120" y1="16" x2="120" y2="134" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1="40" y1="75" x2="200" y2="75" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" />
          </>
        )}
        {forma === 'trapecio' && (
          <>
            <polygon points="70,25 170,25 205,125 35,125" fill="#eef2ff" stroke="#1e293b" strokeWidth="2.5" />
            <line x1="70" y1="25" x2="70" y2="125" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" />
          </>
        )}
      </svg>

      {medidas.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {medidas.map((m, idx) => (
            <span
              key={idx}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-800"
            >
              {m.etiqueta}: <strong>{m.valor}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EjesCoordenadasSvg({
  rango = 5,
  puntos = [],
  showSolution,
}: {
  rango?: number;
  puntos?: Array<{ x: number; y: number; etiqueta?: string }>;
  showSolution: boolean;
}) {
  const safeRange = Math.max(3, Math.min(10, Math.round(rango)));
  const size = 220;
  const center = size / 2;
  const step = (size - 32) / (safeRange * 2);

  const gridLines = [];
  for (let i = -safeRange; i <= safeRange; i += 1) {
    const pos = center + i * step;
    gridLines.push(
      <line key={`v_${i}`} x1={pos} y1={16} x2={pos} y2={size - 16} stroke="#e2e8f0" strokeWidth={1} />,
    );
    gridLines.push(
      <line key={`h_${i}`} x1={16} y1={pos} x2={size - 16} y2={pos} stroke="#e2e8f0" strokeWidth={1} />,
    );
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-48 w-48"
      role="img"
      aria-label={`Ejes de coordenadas de -${safeRange} a ${safeRange}`}
    >
      {gridLines}
      <line x1={12} y1={center} x2={size - 12} y2={center} stroke="#0f172a" strokeWidth={2} />
      <line x1={center} y1={12} x2={center} y2={size - 12} stroke="#0f172a" strokeWidth={2} />
      <text x={size - 14} y={center - 6} fontSize="10" fontWeight="700" fill="#0f172a">
        X
      </text>
      <text x={center + 6} y={18} fontSize="10" fontWeight="700" fill="#0f172a">
        Y
      </text>

      {showSolution &&
        puntos.map((pt, idx) => {
          const px = center + pt.x * step;
          const py = center - pt.y * step;
          return (
            <g key={idx}>
              <circle cx={px} cy={py} r={4.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />
              <text x={px + 6} y={py - 6} fontSize="10" fontWeight="700" fill="#312e81">
                {pt.etiqueta || `(${pt.x},${pt.y})`}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

/**
 * Renderiza figuras geométricas, fracciones para colorear, rectas numéricas,
 * tablas de datos y diagramas SVG seguros listos para pantalla e impresión A4.
 */
export function VisualFigureRenderer({
  spec,
  showSolution = false,
  className = '',
}: VisualFigureRendererProps) {
  const isColorMode = spec.modo !== 'lectura';
  const shouldShade = isColorMode ? showSolution : true;

  return (
    <figure
      className={`print-avoid-break print-preserve-color my-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-center ${className}`}
    >
      {spec.titulo && (
        <figcaption className="mb-2 text-xs font-bold text-slate-700">
          {spec.titulo}
        </figcaption>
      )}

      {spec.tipo === 'fraccion_barra' && (
        <FraccionBarraSvg
          denominador={spec.denominador ?? 4}
          numerador={spec.numerador ?? 1}
          filas={spec.filas ?? 1}
          shaded={shouldShade}
        />
      )}

      {spec.tipo === 'fraccion_circulo' && (
        <FraccionCirculoSvg
          denominador={spec.denominador ?? 4}
          numerador={spec.numerador ?? 1}
          shaded={shouldShade}
        />
      )}

      {spec.tipo === 'recta_numerica' && (
        <RectaNumericaSvg
          min={spec.min ?? 0}
          max={spec.max ?? 5}
          paso={spec.paso ?? 1}
          marcas={spec.marcas_destacadas}
          showSolution={showSolution || spec.modo === 'lectura'}
        />
      )}

      {spec.tipo === 'figura_geometrica' && (
        <FiguraGeometricaSvg forma={spec.forma} medidas={spec.medidas} />
      )}

      {spec.tipo === 'ejes_coordenadas' && (
        <EjesCoordenadasSvg
          rango={spec.rango}
          puntos={spec.puntos}
          showSolution={showSolution || spec.modo === 'lectura'}
        />
      )}

      {spec.tipo === 'tabla_datos' && (spec.columnas?.length ?? 0) > 0 && (
        <div className="overflow-x-auto">
          <table className="mx-auto w-full max-w-lg border-collapse border border-slate-300 bg-white text-xs">
            <thead className="bg-slate-100">
              <tr>
                {spec.columnas?.map((col, idx) => (
                  <th
                    key={idx}
                    className="border border-slate-300 px-2.5 py-2 font-bold text-slate-800"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(spec.filas_tabla ?? []).map((row, rIdx) => (
                <tr key={rIdx}>
                  {spec.columnas?.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="border border-slate-300 px-2.5 py-2 text-slate-800"
                    >
                      {row[cIdx] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
              {!showSolution &&
                Array.from({ length: Math.max(0, Math.min(8, spec.filas_vacias_alumno ?? 0)) }).map(
                  (_, emptyIdx) => (
                    <tr key={`empty_${emptyIdx}`}>
                      {spec.columnas?.map((__, cIdx) => (
                        <td
                          key={cIdx}
                          className="h-7 border border-slate-300 px-2.5 py-2"
                        />
                      ))}
                    </tr>
                  ),
                )}
            </tbody>
          </table>
        </div>
      )}

      {spec.tipo === 'svg_libre' && spec.svg_contenido && (
        <svg
          viewBox={spec.viewBox || '0 0 280 160'}
          className="mx-auto max-h-44 w-auto max-w-full"
          role="img"
          aria-label={spec.titulo || 'Ilustración pedagógica'}
          dangerouslySetInnerHTML={{ __html: sanitizeSvgContent(spec.svg_contenido) }}
        />
      )}

      {spec.pie_figura && (
        <p className="mt-2 text-[11px] font-medium text-slate-500">{spec.pie_figura}</p>
      )}
    </figure>
  );
}
