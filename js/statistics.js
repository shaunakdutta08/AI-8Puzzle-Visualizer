export const formatState = key => key ? `${key.slice(0, 3)} · ${key.slice(3, 6)} · ${key.slice(6, 9)}` : '—';
export const number = value => value == null ? '—' : value.toLocaleString('en-US');
export const statusLabel = status => ({ searching: 'Searching', solved: 'Solved', cancelled: 'Cancelled', unsolvable: 'Unsolvable', limited: 'Stopped at limit', exhausted: 'Frontier exhausted', ready: 'Ready' }[status] || 'Ready');

export function renderStats(element, stats = null, status = 'ready') {
  const memory = stats ? stats.memoryBytes < 1048576 ? `${(stats.memoryBytes / 1024).toFixed(1)} <small>KiB</small>` : `${(stats.memoryBytes / 1048576).toFixed(2)} <small>MiB</small>` : '—';
  const entries = [
    ['Solution status', statusLabel(status)], ['Nodes generated', number(stats?.generated)],
    ['Nodes expanded', number(stats?.expanded)], ['Maximum search depth', number(stats?.maxDepth)],
    ['Solution depth', number(stats?.solutionDepth)], ['Total moves', number(stats?.moves)],
    ['Execution time', stats ? `${stats.elapsed.toFixed(1)} <small>ms</small>` : '—'],
    ['Memory usage · estimate', memory]
  ];
  element.innerHTML = entries.map(([label, value]) => `<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong></div>`).join('');
}
