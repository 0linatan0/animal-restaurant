export class OfflineManager {
  constructor(onChange) { this.onChange = onChange; this.ready = false; this.message = '正在准备餐厅…'; this.update = false; }
  async start() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) { this.message = '请通过 HTTPS 或本机 localhost，在 Safari / Chrome 中打开。'; this.onChange(); return; }
    try {
      this.registration = await navigator.serviceWorker.register('./sw.js');
      this.registration.addEventListener('updatefound', () => {
        const worker = this.registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') { this.update = !!this.registration.waiting; this.check(); } if (worker.state === 'redundant') { this.message = '资源准备未完成，请联网后重试。'; this.onChange(); } });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (this.updating) location.reload(); else this.check(); });
      this.update = !!this.registration.waiting;
      await this.check();
      // 首次安装失败时 ready 不会完成，轮询给出可重试状态。
      if (!this.ready) this.poll = setInterval(() => this.check(), 1500);
    } catch { this.message = '餐厅资源还没准备好，请检查网络后重试。'; this.onChange(); }
  }
  async check() {
    const worker = navigator.serviceWorker.controller || this.registration?.active;
    if (!worker) { this.onChange(); return; }
    const ready = await new Promise(resolve => {
      const channel = new MessageChannel(); const timeout = setTimeout(() => resolve(false), 5000);
      channel.port1.onmessage = e => { clearTimeout(timeout); channel.port1.close(); resolve(e.data?.ready === true); };
      worker.postMessage({ type: 'CHECK_CACHE' }, [channel.port2]);
    });
    this.ready = ready; this.update = !!this.registration?.waiting;
    this.message = ready ? '已准备好，可以离线玩' : '资源未齐全，请联网后点击重新准备';
    if (ready) clearInterval(this.poll); this.onChange();
  }
  async retry() {
    this.message = '正在重新准备…'; this.onChange();
    const worker = navigator.serviceWorker.controller || this.registration?.active;
    if (worker) {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => { channel.port1.close(); this.check(); };
      worker.postMessage({ type: 'REPAIR_CACHE' }, [channel.port2]);
    } else { await this.registration?.update().catch(() => {}); await this.start(); }
  }
  applyUpdate() { this.updating = true; this.registration?.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' }); }
}
