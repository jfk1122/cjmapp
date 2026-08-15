import { useLayoutEffect, useRef, useState } from 'react';
import type { Journey, Persona } from '../types';
import { IconChevron } from './Icons';

interface Props {
  journey: Journey;
  readOnly: boolean;
  onChange: (next: Journey) => void;
}

const FIELDS: { key: keyof Persona; label: string; placeholder: string; wide?: boolean }[] = [
  { key: 'name', label: 'ペルソナ', placeholder: '例: 佐藤 みなみ（32歳・会社員）' },
  {
    key: 'profile',
    label: '属性・背景',
    placeholder: '居住地／職業／情報接触チャネル／検討状況など',
    wide: true,
  },
  { key: 'goal', label: 'ゴール（ユーザーの目的）', placeholder: '例: 続けやすい価格で肌悩みを解決したい' },
];

/** 入力量にあわせて高さが伸びるテキストエリア */
function AutoTextarea({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      className="field-input"
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function PersonaPanel({ journey, readOnly, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const persona = journey.persona;
  const filled = FIELDS.map((f) => persona[f.key]).filter(Boolean);

  const update = (key: keyof Persona, value: string) =>
    onChange({ ...journey, persona: { ...persona, [key]: value }, updatedAt: Date.now() });

  if (readOnly && filled.length === 0) return null;

  return (
    <section className={`persona${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="persona-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconChevron size={16} />
        <span className="persona-toggle-label">ペルソナ / 前提</span>
        {!open && <span className="persona-preview">{persona.name || '未設定'}</span>}
      </button>

      {open && (
        <div className="persona-grid">
          {FIELDS.map((field) => (
            <label key={field.key} className={`field${field.wide ? ' field--wide' : ''}`}>
              <span className="field-label">{field.label}</span>
              {readOnly ? (
                <p className="field-value">{persona[field.key] || '—'}</p>
              ) : (
                <AutoTextarea
                  value={persona[field.key]}
                  placeholder={field.placeholder}
                  onChange={(v) => update(field.key, v)}
                />
              )}
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
