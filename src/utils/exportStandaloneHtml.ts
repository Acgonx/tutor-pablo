import type { GamePayload } from '../types/studyMaterial';

function escapeJsonForInlineScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeHtmlAttrAndText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugifyFileName(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Construye un único archivo HTML5 autocontenido (CSS + JS embebido, sin CDN)
 * optimizado para Safari en iPad y uso 100% offline.
 */
export function buildStandaloneHtml(params: {
  asignatura: string;
  titulo: string;
  payload: GamePayload;
}): string {
  if (params.payload.tipo_juego === 'html5_neon') {
    return params.payload.html_completo;
  }

  const safeData = escapeJsonForInlineScript({
    asignatura: params.asignatura,
    titulo: params.titulo,
    payload: params.payload,
  });

  const titleText = escapeHtmlAttrAndText(`${params.titulo} · ${params.asignatura}`);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${titleText}</title>
  <style>
    :root {
      --bg: #f1f5f9;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --border: #cbd5e1;
      --primary: #4f46e5;
      --primary-dark: #4338ca;
      --ok: #059669;
      --ok-bg: #ecfdf5;
      --err: #dc2626;
      --err-bg: #fef2f2;
      --warn: #d97706;
      --warn-bg: #fffbeb;
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
      line-height: 1.5;
    }
    .container {
      max-width: 760px;
      margin: 0 auto;
    }
    .header {
      background: var(--card);
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 18px 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: #e0e7ff;
      color: #3730a3;
    }
    .badge-repaso { background: var(--warn-bg); color: #92400e; border: 1px solid #fde68a; }
    h1 { margin: 0 0 6px; font-size: 22px; line-height: 1.25; }
    .subtitle { margin: 0; color: var(--muted); font-size: 15px; }
    .card {
      background: var(--card);
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 22px 20px;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
    }
    .progress-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .progress-bar {
      height: 10px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
      margin-bottom: 18px;
    }
    .progress-fill {
      height: 100%;
      background: var(--primary);
      transition: width 0.25s ease;
    }
    button {
      font-family: inherit;
      cursor: pointer;
      border: none;
      border-radius: 14px;
      min-height: 48px;
      font-size: 16px;
      font-weight: 600;
      padding: 12px 18px;
      transition: transform 0.08s ease, background-color 0.15s ease, border-color 0.15s ease;
      touch-action: manipulation;
    }
    button:active { transform: scale(0.98); }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-dark); }
    .btn-secondary { background: #f8fafc; color: var(--text); border: 2px solid var(--border); }
    .btn-ok { background: var(--ok); color: #fff; }
    .btn-err { background: var(--err); color: #fff; }
    .btn-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 16px; }
    .flashcard-face {
      border: 2px solid #c7d2fe;
      background: linear-gradient(180deg, #ffffff 0%, #eef2ff 100%);
      border-radius: 18px;
      padding: 28px 20px;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      cursor: pointer;
      user-select: none;
    }
    .flashcard-face.flipped {
      border-color: #a7f3d0;
      background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%);
    }
    .hint-box {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--warn-bg);
      border: 1px solid #fde68a;
      color: #78350f;
      font-size: 14px;
    }
    .feedback-box {
      margin-top: 14px;
      padding: 14px 16px;
      border-radius: 14px;
      font-size: 15px;
    }
    .feedback-ok { background: var(--ok-bg); border: 1px solid #a7f3d0; color: #065f46; }
    .feedback-err { background: var(--err-bg); border: 1px solid #fecaca; color: #991b1b; }
    .option-btn {
      width: 100%;
      text-align: left;
      background: #f8fafc;
      color: var(--text);
      border: 2px solid #cbd5e1;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
    }
    .option-btn.correct { background: var(--ok-bg); border-color: var(--ok); color: #065f46; }
    .option-btn.wrong { background: var(--err-bg); border-color: var(--err); color: #991b1b; }
    .chip-tray { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
    .chip {
      background: #f8fafc;
      border: 2px solid #94a3b8;
      color: var(--text);
      border-radius: 12px;
      padding: 10px 14px;
      min-height: 48px;
      font-size: 15px;
      font-weight: 600;
    }
    .chip.selected { background: #e0e7ff; border-color: var(--primary); color: #312e81; }
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .cat-box {
      border: 2px dashed #94a3b8;
      border-radius: 16px;
      padding: 14px;
      background: #f8fafc;
      min-height: 130px;
      cursor: pointer;
    }
    .cat-box.ready { border-color: var(--primary); background: #eef2ff; }
    .step-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border: 2px solid #cbd5e1;
      border-radius: 14px;
      background: #fff;
      margin-bottom: 10px;
    }
    .step-item.selected { border-color: var(--primary); background: #eef2ff; }
    .step-item.ok { border-color: var(--ok); background: var(--ok-bg); }
    .step-item.err { border-color: var(--err); background: var(--err-bg); }
    .step-controls { display: flex; gap: 6px; flex-shrink: 0; }
    .mini-btn { min-height: 44px; min-width: 44px; padding: 8px 10px; font-size: 14px; }
    .score-big { font-size: 46px; font-weight: 800; color: var(--primary); margin: 6px 0; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="badges">
        <span class="badge" id="badge-asignatura"></span>
        <span class="badge" id="badge-tipo"></span>
      </div>
      <h1 id="game-title"></h1>
      <p class="subtitle" id="game-instructions"></p>
    </header>
    <main id="app" class="card"></main>
  </div>

  <script>
    (function () {
      var DATA = ${safeData};
      var payload = DATA.payload;
      var app = document.getElementById('app');

      var tipoLabels = {
        flashcards: 'Flashcards · Active Recall',
        clasificar: 'Clasificar · Tap to Place',
        trivia_reto: 'Trivia Reto',
        caza_error: '¡Caza al Error! · Detective',
        ordenar_pasos: 'Ordenar Pasos'
      };

      document.getElementById('badge-asignatura').textContent = DATA.asignatura;
      document.getElementById('badge-tipo').textContent = tipoLabels[payload.tipo_juego] || payload.tipo_juego;
      document.getElementById('game-title').textContent = DATA.titulo || payload.titulo;
      document.getElementById('game-instructions').textContent = payload.instrucciones || '';

      function esc(str) {
        return String(str == null ? '' : str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function fmtMath(str) {
        var s = esc(str);
        s = s.replace(/\\$\\$([\\s\\S]+?)\\$\\$|\\$([^$\\n]+?)\\$/g, function (_, d, i) {
          var expr = (d || i || '').trim();
          expr = expr
            .replace(/\\\\frac\\{([^{}]+)\\}\\{([^{}]+)\\}/g, '$1/$2')
            .replace(/\\\\sqrt\\{([^{}]+)\\}/g, '√($1)')
            .replace(/\\\\times/g, '×')
            .replace(/\\\\cdot/g, '·')
            .replace(/\\\\div/g, '÷')
            .replace(/\\\\pi/g, 'π')
            .replace(/\\\\circ/g, '°')
            .replace(/\\\\leq/g, '≤')
            .replace(/\\\\geq/g, '≥')
            .replace(/\\\\neq/g, '≠')
            .replace(/\\\\text\\{([^{}]+)\\}/g, '$1')
            .replace(/\\^2/g, '²')
            .replace(/\\^3/g, '³');
          return '<span style="font-weight:700;color:#1e1b4b">' + expr + '</span>';
        });
        return s;
      }

      function renderVisual(spec, showSol) {
        if (!spec || !spec.tipo) return '';
        var shaded = spec.modo === 'lectura' || Boolean(showSol);
        var inner = '';
        if (spec.tipo === 'fraccion_barra') {
          var den = Math.max(1, Math.min(24, Number(spec.denominador || 4)));
          var num = shaded ? Math.max(0, Math.min(den, Number(spec.numerador || 0))) : 0;
          var w = 36;
          var svgW = den * w + 12;
          inner = '<svg viewBox="0 0 ' + svgW + ' 56" style="max-width:100%;height:64px">';
          for (var i = 0; i < den; i++) {
            inner += '<rect x="' + (6 + i * w) + '" y="6" width="' + w + '" height="40" fill="' + (i < num ? '#818cf8' : '#fff') + '" stroke="#1e293b" stroke-width="2" />';
          }
          inner += '</svg>';
        } else if (spec.tipo === 'fraccion_circulo') {
          var cDen = Math.max(2, Math.min(24, Number(spec.denominador || 4)));
          var cNum = shaded ? Math.max(0, Math.min(cDen, Number(spec.numerador || 0))) : 0;
          var r = 60, cx = 75, cy = 75;
          inner = '<svg viewBox="0 0 150 150" style="width:120px;height:120px">';
          for (var k = 0; k < cDen; k++) {
            var a1 = (k * 2 * Math.PI) / cDen - Math.PI / 2;
            var a2 = ((k + 1) * 2 * Math.PI) / cDen - Math.PI / 2;
            var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
            var x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
            var la = (2 * Math.PI) / cDen > Math.PI ? 1 : 0;
            inner += '<path d="M ' + cx + ' ' + cy + ' L ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + la + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' Z" fill="' + (k < cNum ? '#818cf8' : '#fff') + '" stroke="#1e293b" stroke-width="2" />';
          }
          inner += '</svg>';
        } else if (spec.tipo === 'figura_geometrica') {
          var f = spec.forma || 'rectangulo';
          inner = '<svg viewBox="0 0 220 120" style="width:180px;height:100px">';
          if (f === 'cuadrado') inner += '<rect x="65" y="15" width="90" height="90" fill="#eef2ff" stroke="#1e293b" stroke-width="2.5"/>';
          else if (f === 'triangulo') inner += '<polygon points="110,15 35,105 185,105" fill="#eef2ff" stroke="#1e293b" stroke-width="2.5"/>';
          else if (f === 'circulo') inner += '<circle cx="110" cy="60" r="45" fill="#eef2ff" stroke="#1e293b" stroke-width="2.5"/>';
          else inner += '<rect x="30" y="25" width="160" height="70" fill="#eef2ff" stroke="#1e293b" stroke-width="2.5"/>';
          inner += '</svg>';
          if (spec.medidas && spec.medidas.length) {
            inner += '<div style="font-size:12px;margin-top:4px">' + spec.medidas.map(function (m) { return '<strong>' + esc(m.etiqueta) + ':</strong> ' + esc(m.valor); }).join(' · ') + '</div>';
          }
        }
        if (!inner) return '';
        return '<div style="margin:12px 0;padding:10px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;text-align:center">' +
          (spec.titulo ? '<div style="font-size:12px;font-weight:700;margin-bottom:6px">' + esc(spec.titulo) + '</div>' : '') +
          inner + '</div>';
      }

      function shuffleDiff(items) {
        var arr = items.slice();
        if (arr.length < 2) return arr;
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
        var same = true;
        for (var k = 0; k < arr.length; k++) {
          if (arr[k].id !== items[k].id) { same = false; break; }
        }
        if (same) {
          var first = arr[0];
          arr[0] = arr[arr.length - 1];
          arr[arr.length - 1] = first;
        }
        return arr;
      }

      function renderSummary(aciertos, total, fallos, onRestart) {
        var pct = total > 0 ? Math.round((aciertos / total) * 100) : 100;
        var html = '<div style="text-align:center">' +
          '<p style="font-weight:700;color:#475569;margin:0">¡Reto completado!</p>' +
          '<div class="score-big">' + pct + '%</div>' +
          '<p style="margin:0 0 16px">' + aciertos + ' de ' + total + ' aciertos</p>' +
        '</div>';

        if (fallos.length > 0) {
          html += '<div class="feedback-box feedback-err"><strong>Conceptos para repasar:</strong><ul style="margin:8px 0 0 18px;padding:0">';
          fallos.forEach(function (f) {
            html += '<li style="margin-bottom:6px"><strong>' + esc(f.concepto) + ':</strong> ' + esc(f.detalle) + '</li>';
          });
          html += '</ul></div>';
        } else {
          html += '<div class="feedback-box feedback-ok"><strong>¡Pleno!</strong> No has tenido ningún fallo en esta partida.</div>';
        }

        html += '<div class="btn-row"><button id="btn-restart" class="btn-primary">Volver a jugar</button></div>';
        app.innerHTML = html;
        document.getElementById('btn-restart').addEventListener('click', onRestart);
      }

      function startFlashcards() {
        var cards = payload.tarjetas || [];
        var idx = 0;
        var flipped = false;
        var showHint = false;
        var aciertos = 0;
        var fallos = [];

        function draw() {
          if (idx >= cards.length) {
            renderSummary(aciertos, cards.length, fallos, startFlashcards);
            return;
          }
          var card = cards[idx];
          var pct = Math.round(((idx) / Math.max(1, cards.length)) * 100);
          var repasoBadge = card.es_repaso_libreta ? '<span class="badge badge-repaso">Repaso Libreta</span>' : '';

          app.innerHTML =
            '<div class="progress-wrap"><span>Tarjeta ' + (idx + 1) + ' de ' + cards.length + '</span>' + repasoBadge + '</div>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
            '<div id="fc-box" class="flashcard-face ' + (flipped ? 'flipped' : '') + '">' +
              '<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:8px">' +
                (flipped ? 'Respuesta' : 'Toca la tarjeta para ver la respuesta') +
              '</div>' +
              '<div style="font-size:20px;font-weight:700">' + fmtMath(flipped ? card.reverso : card.frente) + '</div>' +
              (card.recurso_visual ? renderVisual(card.recurso_visual, flipped) : '') +
            '</div>' +
            (!flipped && card.pista ? (
              '<div style="margin-top:12px"><button id="fc-hint-btn" class="btn-secondary" style="width:100%">' +
              (showHint ? 'Ocultar pista' : 'Necesito una pista') + '</button>' +
              (showHint ? '<div class="hint-box">' + esc(card.pista) + '</div>' : '') + '</div>'
            ) : '') +
            (flipped ? (
              '<div class="btn-row">' +
                '<button id="fc-fail" class="btn-err">Fallé · Repasar</button>' +
                '<button id="fc-ok" class="btn-ok">¡La sabía!</button>' +
              '</div>'
            ) : '');

          document.getElementById('fc-box').addEventListener('click', function () {
            flipped = !flipped;
            draw();
          });
          var hintBtn = document.getElementById('fc-hint-btn');
          if (hintBtn) {
            hintBtn.addEventListener('click', function () {
              showHint = !showHint;
              draw();
            });
          }
          var okBtn = document.getElementById('fc-ok');
          if (okBtn) {
            okBtn.addEventListener('click', function () {
              aciertos += 1;
              idx += 1;
              flipped = false;
              showHint = false;
              draw();
            });
          }
          var failBtn = document.getElementById('fc-fail');
          if (failBtn) {
            failBtn.addEventListener('click', function () {
              fallos.push({ concepto: card.concepto_clave || card.frente, detalle: card.reverso });
              idx += 1;
              flipped = false;
              showHint = false;
              draw();
            });
          }
        }
        draw();
      }

      function startClasificar() {
        var cats = payload.categorias || [];
        var elems = payload.elementos || [];
        var placements = {};
        var selectedId = null;
        var checked = false;

        function draw() {
          var unassigned = elems.filter(function (e) { return !placements[e.id]; });
          var allPlaced = unassigned.length === 0;
          var aciertos = 0;
          var fallos = [];

          var html = '<div class="progress-wrap"><span>Colocados: ' + (elems.length - unassigned.length) + ' de ' + elems.length + '</span></div>';

          if (!checked) {
            html += '<p style="margin:0 0 10px;font-size:14px;color:#475569">1. Toca un concepto. 2. Toca la caja donde pertenece.</p>';
            html += '<div class="chip-tray">';
            if (unassigned.length === 0) {
              html += '<span style="color:#059669;font-weight:700">Todos los elementos están colocados. ¡Comprueba tu respuesta!</span>';
            } else {
              unassigned.forEach(function (el) {
                html += '<button class="chip ' + (selectedId === el.id ? 'selected' : '') + '" data-chip="' + esc(el.id) + '">' + esc(el.texto) + '</button>';
              });
            }
            html += '</div>';
          }

          html += '<div class="cat-grid">';
          cats.forEach(function (cat) {
            var inside = elems.filter(function (e) { return placements[e.id] === cat.id; });
            html += '<div class="cat-box ' + (selectedId && !checked ? 'ready' : '') + '" data-cat="' + esc(cat.id) + '">' +
              '<div style="font-weight:800;font-size:16px">' + esc(cat.nombre) + '</div>' +
              '<div style="font-size:13px;color:#475569;margin-bottom:10px">' + esc(cat.descripcion) + '</div>';
            inside.forEach(function (item) {
              var isOk = item.categoria_correcta_id === cat.id;
              if (checked) {
                if (isOk) aciertos += 1;
                else fallos.push({ concepto: item.texto, detalle: item.explicacion });
              }
              var cls = checked ? (isOk ? 'feedback-ok' : 'feedback-err') : 'chip';
              html += '<div class="' + cls + '" data-placed="' + esc(item.id) + '" style="margin-bottom:8px;padding:10px;border-radius:10px">' +
                '<strong>' + esc(item.texto) + '</strong>' +
                (checked ? '<div style="font-size:13px;margin-top:4px">' + esc(item.explicacion) + '</div>' : '') +
              '</div>';
            });
            html += '</div>';
          });
          html += '</div>';

          if (!checked) {
            html += '<div class="btn-row"><button id="cls-check" class="btn-primary" ' + (allPlaced ? '' : 'disabled style="opacity:0.5"') + '>Comprobar clasificación</button></div>';
          } else {
            html += '<div class="btn-row"><button id="cls-finish" class="btn-primary">Ver resultado (' + aciertos + '/' + elems.length + ')</button></div>';
          }

          app.innerHTML = html;

          if (!checked) {
            app.querySelectorAll('[data-chip]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-chip');
                selectedId = selectedId === id ? null : id;
                draw();
              });
            });
            app.querySelectorAll('[data-placed]').forEach(function (el) {
              el.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var id = el.getAttribute('data-placed');
                delete placements[id];
                selectedId = id;
                draw();
              });
            });
            app.querySelectorAll('[data-cat]').forEach(function (box) {
              box.addEventListener('click', function () {
                if (!selectedId) return;
                placements[selectedId] = box.getAttribute('data-cat');
                selectedId = null;
                draw();
              });
            });
            var checkBtn = document.getElementById('cls-check');
            if (checkBtn && allPlaced) {
              checkBtn.addEventListener('click', function () {
                checked = true;
                draw();
              });
            }
          } else {
            document.getElementById('cls-finish').addEventListener('click', function () {
              renderSummary(aciertos, elems.length, fallos, startClasificar);
            });
          }
        }
        draw();
      }

      function startTrivia() {
        var qs = payload.preguntas || [];
        var idx = 0;
        var chosen = null;
        var showHint = false;
        var aciertos = 0;
        var fallos = [];

        function draw() {
          if (idx >= qs.length) {
            renderSummary(aciertos, qs.length, fallos, startTrivia);
            return;
          }
          var q = qs[idx];
          var pct = Math.round((idx / Math.max(1, qs.length)) * 100);
          var letters = ['A', 'B', 'C', 'D'];
          var html = '<div class="progress-wrap"><span>Pregunta ' + (idx + 1) + ' de ' + qs.length + '</span>' +
            (q.es_repaso_libreta ? '<span class="badge badge-repaso">Repaso Libreta</span>' : '') + '</div>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
            '<h2 style="margin:0 0 16px;font-size:20px">' + fmtMath(q.pregunta) + '</h2>' +
            (q.recurso_visual ? renderVisual(q.recurso_visual, chosen !== null) : '');

          q.opciones.forEach(function (opt, i) {
            var cls = 'option-btn';
            if (chosen !== null) {
              if (i === q.indice_correcto) cls += ' correct';
              else if (i === chosen) cls += ' wrong';
            }
            html += '<button class="' + cls + '" data-opt="' + i + '" ' + (chosen !== null ? 'disabled' : '') + '>' +
              '<span style="font-weight:800">' + (letters[i] || (i + 1)) + '.</span> <span>' + fmtMath(opt) + '</span></button>';
          });

          if (chosen === null && q.pista) {
            html += '<button id="tr-hint" class="btn-secondary" style="width:100%;margin-top:6px">' + (showHint ? 'Ocultar pista' : 'Ver pista') + '</button>';
            if (showHint) html += '<div class="hint-box">' + esc(q.pista) + '</div>';
          }

          if (chosen !== null) {
            var ok = chosen === q.indice_correcto;
            html += '<div class="feedback-box ' + (ok ? 'feedback-ok' : 'feedback-err') + '">' +
              '<strong>' + (ok ? '¡Correcto!' : 'Incorrecto.') + '</strong> ' + esc(q.explicacion) + '</div>' +
              '<div class="btn-row"><button id="tr-next" class="btn-primary">' +
              (idx + 1 < qs.length ? 'Siguiente pregunta' : 'Ver resultado') + '</button></div>';
          }

          app.innerHTML = html;

          if (chosen === null) {
            app.querySelectorAll('[data-opt]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                chosen = Number(btn.getAttribute('data-opt'));
                if (chosen === q.indice_correcto) {
                  aciertos += 1;
                } else {
                  fallos.push({
                    concepto: q.concepto_clave || q.pregunta,
                    detalle: q.explicacion,
                    respuesta_alumno: q.opciones[chosen],
                    respuesta_correcta: q.opciones[q.indice_correcto]
                  });
                }
                draw();
              });
            });
            var hintBtn = document.getElementById('tr-hint');
            if (hintBtn) {
              hintBtn.addEventListener('click', function () { showHint = !showHint; draw(); });
            }
          } else {
            document.getElementById('tr-next').addEventListener('click', function () {
              idx += 1;
              chosen = null;
              showHint = false;
              draw();
            });
          }
        }
        draw();
      }

      function startOrdenar() {
        var seqs = payload.secuencias || [];
        var idx = 0;
        var currentOrder = [];
        var selectedPos = null;
        var checked = false;
        var aciertos = 0;
        var fallos = [];

        function loadSeq() {
          if (idx >= seqs.length) {
            renderSummary(aciertos, seqs.length, fallos, startOrdenar);
            return;
          }
          currentOrder = shuffleDiff(seqs[idx].pasos_orden_correcto || []);
          selectedPos = null;
          checked = false;
          draw();
        }

        function swap(a, b) {
          var tmp = currentOrder[a];
          currentOrder[a] = currentOrder[b];
          currentOrder[b] = tmp;
        }

        function draw() {
          var seq = seqs[idx];
          var correctOrder = seq.pasos_orden_correcto || [];
          var allOk = true;
          var html = '<div class="progress-wrap"><span>Secuencia ' + (idx + 1) + ' de ' + seqs.length + '</span>' +
            (seq.es_repaso_libreta ? '<span class="badge badge-repaso">Repaso Libreta</span>' : '') + '</div>' +
            '<h2 style="margin:0 0 12px;font-size:19px">' + esc(seq.enunciado) + '</h2>' +
            '<p style="margin:0 0 14px;font-size:14px;color:#475569">Usa las flechas o toca dos pasos para intercambiarlos.</p>';

          currentOrder.forEach(function (step, pos) {
            var isStepOk = correctOrder[pos] && correctOrder[pos].id === step.id;
            if (checked && !isStepOk) allOk = false;
            var cls = 'step-item';
            if (checked) cls += isStepOk ? ' ok' : ' err';
            else if (selectedPos === pos) cls += ' selected';

            html += '<div class="' + cls + '" data-pos="' + pos + '">' +
              '<div><strong>' + (pos + 1) + '.</strong> ' + esc(step.texto) + '</div>' +
              (!checked ? (
                '<div class="step-controls">' +
                  '<button class="btn-secondary mini-btn" data-up="' + pos + '" ' + (pos === 0 ? 'disabled' : '') + '>▲</button>' +
                  '<button class="btn-secondary mini-btn" data-down="' + pos + '" ' + (pos === currentOrder.length - 1 ? 'disabled' : '') + '>▼</button>' +
                '</div>'
              ) : '') +
            '</div>';
          });

          if (!checked) {
            html += '<div class="btn-row"><button id="ord-check" class="btn-primary">Comprobar orden</button></div>';
          } else {
            html += '<div class="feedback-box ' + (allOk ? 'feedback-ok' : 'feedback-err') + '">' +
              '<strong>' + (allOk ? '¡Orden perfecto!' : 'Hay pasos desordenados.') + '</strong> ' + esc(seq.explicacion_final) + '</div>' +
              '<div class="btn-row"><button id="ord-next" class="btn-primary">' +
              (idx + 1 < seqs.length ? 'Siguiente secuencia' : 'Ver resultado') + '</button></div>';
          }

          app.innerHTML = html;

          if (!checked) {
            app.querySelectorAll('[data-up]').forEach(function (btn) {
              btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var p = Number(btn.getAttribute('data-up'));
                if (p > 0) { swap(p, p - 1); selectedPos = null; draw(); }
              });
            });
            app.querySelectorAll('[data-down]').forEach(function (btn) {
              btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var p = Number(btn.getAttribute('data-down'));
                if (p < currentOrder.length - 1) { swap(p, p + 1); selectedPos = null; draw(); }
              });
            });
            app.querySelectorAll('[data-pos]').forEach(function (row) {
              row.addEventListener('click', function () {
                var p = Number(row.getAttribute('data-pos'));
                if (selectedPos === null) { selectedPos = p; }
                else if (selectedPos === p) { selectedPos = null; }
                else { swap(selectedPos, p); selectedPos = null; }
                draw();
              });
            });
            document.getElementById('ord-check').addEventListener('click', function () {
              checked = true;
              var seqOk = currentOrder.every(function (s, p) { return correctOrder[p] && correctOrder[p].id === s.id; });
              if (seqOk) aciertos += 1;
              else fallos.push({ concepto: seq.concepto_clave || seq.enunciado, detalle: seq.explicacion_final });
              draw();
            });
          } else {
            document.getElementById('ord-next').addEventListener('click', function () {
              idx += 1;
              loadSeq();
            });
          }
        }
        loadSeq();
      }

      function startCazaError() {
        var casos = payload.casos || [];
        var idx = 0;
        var chosen = null;
        var aciertos = 0;
        var fallos = [];

        function draw() {
          if (idx >= casos.length) {
            renderSummary(aciertos, casos.length, fallos, startCazaError);
            return;
          }
          var caso = casos[idx];
          var pct = Math.round((idx / Math.max(1, casos.length)) * 100);
          var html = '<div class="progress-wrap"><span>Caso ' + (idx + 1) + ' de ' + casos.length + '</span>' +
            (caso.es_repaso_libreta ? '<span class="badge badge-repaso">Repaso Libreta</span>' : '') + '</div>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
            '<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase">Toca la afirmación con trampa o error</p>' +
            '<h2 style="margin:0 0 16px;font-size:19px">' + fmtMath(caso.contexto) + '</h2>' +
            (caso.recurso_visual ? renderVisual(caso.recurso_visual, chosen !== null) : '');

          (caso.afirmaciones || []).forEach(function (st, i) {
            var cls = 'option-btn';
            if (chosen !== null) {
              if (i === caso.indice_error) cls += ' correct';
              else if (i === chosen) cls += ' wrong';
            }
            html += '<button class="' + cls + '" data-ce="' + i + '" ' + (chosen !== null ? 'disabled' : '') + '>' +
              '<span style="font-weight:800">' + (i + 1) + '.</span> <span>' + fmtMath(st) + '</span></button>';
          });

          if (chosen !== null) {
            var ok = chosen === caso.indice_error;
            html += '<div class="feedback-box ' + (ok ? 'feedback-ok' : 'feedback-err') + '">' +
              '<strong>' + (ok ? '¡Trampa cazada!' : 'Esa era correcta.') + '</strong> ' + esc(caso.explicacion_correccion) + '</div>' +
              '<div class="btn-row"><button id="ce-next" class="btn-primary">' +
              (idx + 1 < casos.length ? 'Siguiente caso' : 'Ver resultado') + '</button></div>';
          }

          app.innerHTML = html;

          if (chosen === null) {
            app.querySelectorAll('[data-ce]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                chosen = Number(btn.getAttribute('data-ce'));
                if (chosen === caso.indice_error) {
                  aciertos += 1;
                } else {
                  fallos.push({
                    concepto: caso.concepto_clave || caso.contexto,
                    detalle: caso.explicacion_correccion,
                    respuesta_alumno: caso.afirmaciones[chosen],
                    respuesta_correcta: caso.afirmaciones[caso.indice_error]
                  });
                }
                draw();
              });
            });
          } else {
            document.getElementById('ce-next').addEventListener('click', function () {
              idx += 1;
              chosen = null;
              draw();
            });
          }
        }
        draw();
      }

      if (payload.tipo_juego === 'flashcards') startFlashcards();
      else if (payload.tipo_juego === 'clasificar') startClasificar();
      else if (payload.tipo_juego === 'trivia_reto') startTrivia();
      else if (payload.tipo_juego === 'caza_error') startCazaError();
      else if (payload.tipo_juego === 'ordenar_pasos') startOrdenar();
    })();
  </script>
</body>
</html>`;
}

export function downloadStandaloneHtml(params: {
  asignatura: string;
  titulo: string;
  payload: GamePayload;
}): void {
  const html = buildStandaloneHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const subjectSlug = slugifyFileName(params.asignatura) || 'materia';
  const titleSlug = slugifyFileName(params.titulo) || params.payload.tipo_juego;
  link.href = url;
  link.download = `reto-pablo-${subjectSlug}-${titleSlug}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
