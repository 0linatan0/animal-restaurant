import { randomUUID } from 'node:crypto';
import { SAMPLE_RATE, pcmToWav } from './core.mjs';

export const ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';

export function requestHeaders(profile) {
  const headers = { 'Content-Type': 'application/json', 'X-Api-Resource-Id': 'seed-icl-2.0', 'X-Api-Request-Id': randomUUID() };
  if (profile.apiKey) headers['X-Api-Key'] = profile.apiKey;
  else if (profile.appId && profile.accessToken) {
    headers['X-Api-App-Id'] = profile.appId; headers['X-Api-Access-Key'] = profile.accessToken;
  } else throw new Error('缺少火山 API Key，或 App ID / Access Token；请先填写本机凭据文件。');
  return headers;
}

export async function readPcmStream(body) {
  if (!body) throw new Error('服务未返回音频流。');
  const decoder = new TextDecoder(), parts = [];
  let pending = '', size = 0, pcmSize = 0, complete = false;
  const consume = line => {
    if (!line.trim()) return;
    if (complete) throw new Error('成功终止后收到额外响应，未保存音频。');
    let event; try { event = JSON.parse(line); } catch { throw new Error('服务响应不是完整 JSON，未保存音频。'); }
    if (!event || typeof event !== 'object') throw new Error('服务响应格式错误。');
    if (event.code !== 0 && event.code !== 20000000) {
      // 不记录服务端 message，它可能包含鉴权参数、音色 ID 或其他私有内容。
      throw new Error(`火山合成失败（状态码 ${Number.isInteger(event.code) ? event.code : '未知'}）；请在控制台检查授权、额度及参数。`);
    }
    if (event.data != null && event.data !== '') {
      if (typeof event.data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(event.data)) throw new Error('音频 base64 数据损坏。');
      const bytes = Buffer.from(event.data, 'base64');
      pcmSize += bytes.length;
      if (pcmSize > SAMPLE_RATE * 2 * 15) throw new Error('生成音频超过 15 秒，未保存此句。');
      parts.push(bytes);
    }
    if (event.code === 20000000) complete = true;
  };
  for await (const chunk of body) {
    size += chunk.byteLength;
    if (size > 2 * 1024 * 1024) throw new Error('服务响应超出大小限制。');
    pending += decoder.decode(chunk, { stream: true });
    let end;
    while ((end = pending.indexOf('\n')) !== -1) { consume(pending.slice(0, end)); pending = pending.slice(end + 1); }
  }
  consume(pending + decoder.decode());
  if (!complete) throw new Error('合成流中断，没有成功终止标记；此句未写入缓存，可重新运行。');
  return Buffer.concat(parts);
}

export async function synthesize(profile, line, { fetchImpl = fetch, timeoutMs = 90000 } = {}) {
  const headers = requestHeaders(profile);
  let response;
  try {
    response = await fetchImpl(ENDPOINT, { method: 'POST', redirect: 'error', headers, signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ user: { uid: 'little-kitchen-local-tool' }, req_params: { text: line.text, speaker: profile.speaker,
        model: profile.model, audio_params: { format: 'pcm', sample_rate: SAMPLE_RATE, speech_rate: profile.speechRate } } }) });
  } catch { throw new Error('火山请求未完成（网络、超时或重定向）；没有自动重试，重新生成可能再次计费。'); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`火山请求失败（HTTP ${response.status}）；检查凭据、服务开通和额度后重试。`);
  }
  try { return pcmToWav(await readPcmStream(response.body)); }
  catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError' || error.name === 'TypeError') throw new Error('接收音频中断或超时，此句未保存；重新生成可能再次计费。');
    throw error;
  }
}
