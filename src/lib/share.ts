import type { Journey } from '../types';
import { normalize } from './storage';

/**
 * サーバーを持たずに共有するため、マップ全体を圧縮して URL のハッシュに載せる。
 * 形式: `<version><payload>` / version 'c' = deflate-raw 圧縮, 'p' = 無圧縮
 */

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function streamThrough(bytes: Uint8Array, stream: ReadableWritablePair): Promise<Uint8Array> {
  const blob = new Blob([bytes as BlobPart]);
  const buf = await new Response(blob.stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(buf);
}

export async function encodeJourney(journey: Journey): Promise<string> {
  const json = JSON.stringify(journey);
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function') {
    try {
      const packed = await streamThrough(bytes, new CompressionStream('deflate-raw'));
      return 'c' + bytesToBase64Url(packed);
    } catch {
      /* 圧縮できない環境では無圧縮にフォールバックする */
    }
  }
  return 'p' + bytesToBase64Url(bytes);
}

export async function decodeJourney(payload: string): Promise<Journey> {
  const version = payload[0];
  const bytes = base64UrlToBytes(payload.slice(1));
  const raw =
    version === 'c'
      ? await streamThrough(bytes, new DecompressionStream('deflate-raw'))
      : bytes;
  const parsed = JSON.parse(new TextDecoder().decode(raw)) as Journey;
  return normalize(parsed);
}

export async function buildShareUrl(journey: Journey): Promise<string> {
  const payload = await encodeJourney(journey);
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#/view/${payload}`;
}
