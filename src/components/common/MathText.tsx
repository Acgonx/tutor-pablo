import katex from 'katex';
import { Fragment } from 'react';

interface MathTextProps {
  text: string | undefined | null;
  className?: string;
}

interface TextSegment {
  type: 'text' | 'inline' | 'display';
  content: string;
}

const MATH_TOKEN_REGEX =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?:\\.|[^$\n])+?\$)/g;

function parseMathSegments(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(MATH_TOKEN_REGEX)) {
    const idx = match.index ?? 0;
    const rawToken = match[0];

    if (idx > lastIndex) {
      segments.push({ type: 'text', content: input.slice(lastIndex, idx) });
    }

    if (rawToken.startsWith('$$') && rawToken.endsWith('$$')) {
      segments.push({ type: 'display', content: rawToken.slice(2, -2).trim() });
    } else if (rawToken.startsWith('\\[') && rawToken.endsWith('\\]')) {
      segments.push({ type: 'display', content: rawToken.slice(2, -2).trim() });
    } else if (rawToken.startsWith('\\(') && rawToken.endsWith('\\)')) {
      segments.push({ type: 'inline', content: rawToken.slice(2, -2).trim() });
    } else if (rawToken.startsWith('$') && rawToken.endsWith('$')) {
      const inner = rawToken.slice(1, -1).trim();
      if (/^\d+(?:[.,]\d+)?(?:\s*€)?$/.test(inner)) {
        segments.push({ type: 'text', content: rawToken });
      } else {
        segments.push({ type: 'inline', content: inner });
      }
    }

    lastIndex = idx + rawToken.length;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', content: input.slice(lastIndex) });
  }

  return segments;
}

/**
 * Renderiza texto combinado con expresiones LaTeX ($...$, $$...$$, \(...\), \[...\])
 * mediante KaTeX tanto en pantalla como al imprimir en PDF.
 */
export function MathText({ text, className }: MathTextProps) {
  if (!text) return null;

  const segments = parseMathSegments(text);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <Fragment key={idx}>{seg.content}</Fragment>;
        }

        const html = katex.renderToString(seg.content, {
          displayMode: seg.type === 'display',
          throwOnError: false,
          strict: false,
        });

        return (
          <span
            key={idx}
            className={
              seg.type === 'display'
                ? 'my-2 block overflow-x-auto text-center'
                : 'inline-block align-middle'
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
