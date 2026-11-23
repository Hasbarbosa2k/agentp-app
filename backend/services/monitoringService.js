const System = require('../models/System');
const connectivityService = require('./connectivityService');

class MonitoringService {
  constructor() {
    this.timer = null;
    this.intervalMs = parseInt(process.env.MONITOR_INTERVAL_MS || '60000', 10); // default: 60s
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.runOnce().catch(() => {});
    }, this.intervalMs);
    // run immediately on start
    this.runOnce().catch(() => {});
    console.log(`🧭 MonitoringService iniciado. Intervalo: ${this.intervalMs}ms`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;
  }

  async runOnce() {
    const systems = await System.find({ isActive: true, monitoringEnabled: true }).select('_id ip status lastTest lastTestStatus');
    const checks = systems.map(async (system) => {
      try {
        const ping = await connectivityService.quickPing(system.ip, 1);
        const ok = !!ping?.success;
        system.lastTest = new Date();
        system.lastTestStatus = ok ? 'success' : 'failed';
        system.status = ok ? 'online' : 'offline';
        await system.save();
      } catch (err) {
        system.lastTest = new Date();
        system.lastTestStatus = 'failed';
        system.status = 'offline';
        await system.save();
      }
    });
    await Promise.allSettled(checks);
  }
}

module.exports = new MonitoringService();

