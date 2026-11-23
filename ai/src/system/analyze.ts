export type Summary = {
  topProcesses: Array<{ name: string; cpuPercent: number }>;
  activeServices: Array<{ name: string; state: string }>;
  openPorts: Array<{ port: number; label: string; proto: string; process?: string }>;
  systemInfo: { kernel?: string; arch?: string; loadAvg?: [number, number, number]; users?: number; osName?: string; osVersion?: string };
};

const WELL_KNOWN_PORTS: Record<number, string> = {
  22: 'SSH',
  80: 'HTTP',
  443: 'HTTPS',
  3306: 'MySQL',
  5432: 'PostgreSQL',
  6379: 'Redis',
  8080: 'HTTP-alt',
  3000: 'Node',
  3001: 'Node',
};

const RELEVANT_SERVICES = new Set([
  'apache2', 'nginx', 'mysql', 'mariadb', 'postgres', 'postgresql', 'redis',
  'docker', 'containerd', 'node', 'gunicorn', 'php-fpm', 'php8.2-fpm', 'supervisor', 'ssh',
]);

export function parseTop(raw: string): { processes: Array<{ name: string; cpu: number }>; loadAvg?: [number, number, number]; users?: number; arch?: string; kernel?: string } {
  const lines = (raw || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let loadAvg: [number, number, number] | undefined;
  let users: number | undefined;
  let arch: string | undefined;
  let kernel: string | undefined;
  // Header may contain users and load average
  for (const l of lines.slice(0, 5)) {
    const mUsers = l.match(/(\d+)\s+user/);
    if (mUsers) users = Number(mUsers[1]);
    const mLoad = l.match(/load average:\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+)/i);
    if (mLoad) loadAvg = [Number(mLoad[1]), Number(mLoad[2]), Number(mLoad[3])];
    const mArch = l.match(/\b(x86_64|arm64|aarch64|amd64)\b/i);
    if (mArch) arch = mArch[1];
    const mKernel = l.match(/Linux\s+([0-9]+\.[^\s]+)/);
    if (mKernel) kernel = mKernel[1];
  }
  // Find process table start (line containing COMMAND or CMD)
  const idx = lines.findIndex(l => /\bCOMMAND\b|\bCMD\b/i.test(l));
  const procs: Array<{ name: string; cpu: number }> = [];
  const rowRe = /^(\S+)\s+\S+\s+\S+\s+([0-9.]+)\s+[0-9.]+\s+\S+\s+(.+)$/; // fallback
  if (idx >= 0) {
    for (const l of lines.slice(idx + 1)) {
      const cols = l.split(/\s+/);
      // Typical top columns: PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND
      const cpuIdx = cols.findIndex(c => /%?CPU/.test(c)) >= 0 ? cols.findIndex(c => /%?CPU/.test(c)) : 8; // guess
      let cpu = NaN;
      let cmd = '';
      // Heuristic parse: CPU value often at position 8, COMMAND at last
      const m = l.match(/\s([0-9.]+)\s+[0-9.]+\s+\S+\s+([^\s].*)$/);
      if (m) {
        cpu = Number(m[1]);
        cmd = m[2];
      } else if (cols.length > 11) {
        cpu = Number(cols[cpuIdx] || '0');
        cmd = cols.slice(11).join(' ');
      } else {
        const m2 = l.match(rowRe);
        if (m2) {
          cpu = Number(m2[2]);
          cmd = m2[3];
        }
      }
      if (!Number.isFinite(cpu)) continue;
      const name = cmd.split('/').pop()!.split(' ')[0];
      procs.push({ name, cpu });
    }
  }
  procs.sort((a, b) => b.cpu - a.cpu);
  return { processes: procs.slice(0, 5), loadAvg, users, arch, kernel };
}

export function parseSystemctl(raw: string): Array<{ name: string; state: string }> {
  const lines = (raw || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out: Array<{ name: string; state: string }> = [];
  for (const l of lines) {
    const parts = l.split(/\s+/);
    const unit = parts[0] || '';
    const name = unit.replace(/\.service$/, '');
    const state = 'active';
    if (RELEVANT_SERVICES.has(name) || /nginx|apache|mysql|maria|postgres|redis|node|php|gunicorn|ssh/i.test(name)) {
      out.push({ name: `${name}.service`, state });
    }
  }
  return out.slice(0, 20);
}

export function parseNetstat(raw: string): Array<{ port: number; label: string; proto: string; process?: string }> {
  const lines = (raw || '').split(/\r?\n/).filter(Boolean);
  const out: Array<{ port: number; label: string; proto: string; process?: string }> = [];
  for (const l of lines) {
    if (!/^tcp/.test(l)) continue;
    const cols = l.trim().split(/\s+/);
    if (cols.length < 7) continue;
    const proto = cols[0];
    const local = cols[3];
    const pidProc = cols[6] || '';
    const m = local.match(/:(\d+)$/);
    if (!m) continue;
    const port = Number(m[1]);
    const label = WELL_KNOWN_PORTS[port] || `:${port}`;
    const process = pidProc.split('/')[1] || undefined;
    out.push({ port, label, proto, process });
  }
  // Deduplicate by port/proto
  const seen = new Set<string>();
  return out.filter(e => { const k = `${e.proto}:${e.port}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

export function parseOsRelease(raw: string): { osName?: string; osVersion?: string } {
  const map = new Map<string, string>();
  for (const line of (raw || '').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  const osName = map.get('PRETTY_NAME') || map.get('NAME');
  const osVersion = map.get('VERSION') || undefined;
  return { osName, osVersion };
}

export function summarizeSystem(inputs: { top: string; systemctl?: string; netstat: string; osRelease: string }): Summary {
  const top = parseTop(inputs.top || '');
  const services = parseSystemctl(inputs.systemctl || '');
  const ports = parseNetstat(inputs.netstat || '');
  // Filter services by whether a relevant port is open
  const openPortSet = new Set(ports.map(p => p.port));
  const filteredServices = services.filter(s =>
    /nginx|apache|mysql|maria|postgres|redis|ssh|node|php|gunicorn/i.test(s.name) ||
    Array.from(openPortSet).some(p => [22, 80, 443, 5432, 3306, 6379, 8080, 3000, 3001].includes(p))
  );
  const os = parseOsRelease(inputs.osRelease || '');
  const systemInfo = {
    kernel: top.kernel,
    arch: top.arch,
    loadAvg: top.loadAvg,
    users: top.users,
    osName: os.osName,
    osVersion: os.osVersion,
  };
  return {
    topProcesses: top.processes.map(p => ({ name: p.name, cpuPercent: Number(p.cpu.toFixed(1)) })),
    activeServices: filteredServices,
    openPorts: ports.map(p => ({ port: p.port, label: p.label, proto: p.proto, process: p.process })),
    systemInfo,
  };
}

