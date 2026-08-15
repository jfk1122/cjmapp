import { cellKey, type Journey } from '../types';

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // 一部のブラウザは DOM に接続されていないリンクの download 属性を無視する
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const safeName = (s: string) => (s.trim() || 'journey-map').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);

export function exportJson(journey: Journey): void {
  download(`${safeName(journey.title)}.json`, JSON.stringify(journey, null, 2), 'application/json');
}

/** 行 × 列のマトリクスをそのまま CSV に落とす（Excel 用に BOM 付き） */
export function exportCsv(journey: Journey): void {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ['', ...journey.stages.map((s) => s.name)];
  const lines = [header.map(esc).join(',')];

  lines.push([esc('フェーズ概要'), ...journey.stages.map((s) => esc(s.summary))].join(','));
  for (const row of journey.rows) {
    const cells = journey.stages.map((s) =>
      esc((journey.cells[cellKey(row.key, s.id)] ?? []).map((c) => `・${c.text}`).join('\n')),
    );
    lines.push([esc(row.label), ...cells].join(','));
  }

  download(`${safeName(journey.title)}.csv`, '﻿' + lines.join('\r\n'), 'text/csv');
}

export function importJson(file: File): Promise<Journey> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ファイルを読み込めませんでした'));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as Journey);
      } catch {
        reject(new Error('JSON の形式が正しくありません'));
      }
    };
    reader.readAsText(file);
  });
}
