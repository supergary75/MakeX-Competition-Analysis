// 图表管理模块
class ChartsManager {
    constructor() {
        this.charts = {};
        this.initCharts();
    }

    initCharts() {
        // 队伍总分排名图表
        this.createTeamScoresChart();
        // 分数分布图表
        this.createScoreDistributionChart();
    }

    createTeamScoresChart() {
        const ctx = document.getElementById('teamScoresChart');
        if (!ctx) return;

        const stats = dataManager.getTeamStats().slice(0, 8);
        const labels = stats.map(team => team.name);
        const data = stats.map(team => team.totalScore);

        if (this.charts.teamScores) {
            this.charts.teamScores.destroy();
        }

        this.charts.teamScores = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '总分',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(199, 199, 199, 0.8)',
                        'rgba(83, 102, 255, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)',
                        'rgba(83, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '分数'
                        }
                    }
                }
            }
        });
    }

    createScoreDistributionChart() {
        const ctx = document.getElementById('scoreDistributionChart');
        if (!ctx) return;

        const ranking = dataManager.getRankingData('composite');
        const points = ranking.map((team, index) => {
            const matches = Number(team.totalMatches || team.matches || 0);
            const epa = Number(team.epa || (matches > 0 ? ((Number(team.totalScore || 0) / matches) / 2).toFixed(2) : 0)) || 0;
            const netScore = Number(team.netScore || 0);
            const jitter = ((index % 7) - 3) * 0.15;
            return {
                x: netScore + jitter,
                y: epa,
                name: team.name,
                epa: epa.toFixed(2),
                matches,
                netScore,
                bucket: Math.floor(epa / 50)
            };
        });

        const bucketColors = [
            'rgba(59, 130, 246, 0.9)',
            'rgba(16, 185, 129, 0.9)',
            'rgba(245, 158, 11, 0.9)',
            'rgba(239, 68, 68, 0.9)',
            'rgba(139, 92, 246, 0.9)',
            'rgba(20, 184, 166, 0.9)',
            'rgba(236, 72, 153, 0.9)',
            'rgba(99, 102, 241, 0.9)'
        ];
        const pointColors = points.map((p) => bucketColors[p.bucket % bucketColors.length]);

        const maxEPA = points.length > 0
            ? Math.max(...points.map((p) => p.y))
            : 0;
        const maxX = points.length > 0
            ? Math.max(...points.map((p) => p.x))
            : 0;
        const minX = points.length > 0
            ? Math.min(...points.map((p) => p.x))
            : 0;
        const axisMaxEPA = Math.max(5, Math.ceil(maxEPA * 1.1));
        const axisPadding = Math.max(2, Math.ceil((maxX - minX) * 0.1));
        const axisMaxX = Math.ceil(maxX + axisPadding);
        const axisMinX = Math.floor(minX - axisPadding);

        const getNameKeyword = (name) => {
            const raw = String(name || '').trim();
            if (!raw) return '';

            const cleaned = raw
                .replace(/[()（）\[\]【】]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            const parts = cleaned.split(/[\s\-_/]+/).filter(Boolean);
            const stopWords = ['team', 'robotics', 'club', '战队', '队伍', '联盟'];

            let candidate = parts.find((p) => !stopWords.includes(p.toLowerCase())) || parts[0] || cleaned;
            if (!candidate) candidate = cleaned;

            // 优先取短关键词，避免标签互相遮挡
            if (/^[\u4e00-\u9fa5]+$/.test(candidate)) {
                return candidate.length > 3 ? candidate.slice(0, 3) : candidate;
            }

            return candidate.length > 4 ? candidate.slice(0, 4) : candidate;
        };

        if (this.charts.scoreDistribution) {
            this.charts.scoreDistribution.destroy();
        }

        const labelPlugin = {
            id: 'epaScatterLabels',
            afterDatasetsDraw: (chart) => {
                const { ctx: chartCtx, chartArea } = chart;
                const meta = chart.getDatasetMeta(0);
                if (!meta || !meta.data) return;

                chartCtx.save();
                chartCtx.fillStyle = '#1f2937';
                chartCtx.font = '11px sans-serif';
                chartCtx.textAlign = 'left';
                chartCtx.textBaseline = 'middle';

                const occupiedRects = [];
                let hiddenCount = 0;

                const intersects = (a, b) => {
                    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
                };

                const isInsideChart = (rect) => {
                    return rect.x >= chartArea.left
                        && rect.y >= chartArea.top
                        && rect.x + rect.w <= chartArea.right
                        && rect.y + rect.h <= chartArea.bottom;
                };

                // 先绘制高EPA队伍标签，保证最关键信息优先可见
                const drawOrder = meta.data
                    .map((_, i) => i)
                    .sort((a, b) => {
                        const da = Number(chart.data.datasets[0].data[a]?.epa || 0);
                        const db = Number(chart.data.datasets[0].data[b]?.epa || 0);
                        return db - da;
                    });

                drawOrder.forEach((index) => {
                    const pointEl = meta.data[index];
                    const raw = chart.data.datasets[0].data[index];
                    if (!raw) return;

                    const label = getNameKeyword(raw.name);
                    if (!label) return;

                    const textWidth = Math.ceil(chartCtx.measureText(label).width);
                    const padX = 4;
                    const padY = 2;
                    const labelW = textWidth + padX * 2;
                    const labelH = 14;

                    const candidates = [
                        { x: pointEl.x + 10, y: pointEl.y - 20 },
                        { x: pointEl.x + 10, y: pointEl.y + 8 },
                        { x: pointEl.x - 10 - labelW, y: pointEl.y - 20 },
                        { x: pointEl.x - 10 - labelW, y: pointEl.y + 8 },
                        { x: pointEl.x - labelW / 2, y: pointEl.y - 26 },
                        { x: pointEl.x - labelW / 2, y: pointEl.y + 10 }
                    ];

                    let chosen = null;
                    for (const c of candidates) {
                        const rect = { x: c.x, y: c.y, w: labelW, h: labelH };
                        if (!isInsideChart(rect)) continue;
                        const hit = occupiedRects.some((r) => intersects(r, rect));
                        if (!hit) {
                            chosen = c;
                            occupiedRects.push(rect);
                            break;
                        }
                    }

                    if (!chosen) {
                        hiddenCount += 1;
                        return;
                    }

                    // 引导线，增强点与标签的对应关系
                    chartCtx.strokeStyle = 'rgba(107, 114, 128, 0.5)';
                    chartCtx.lineWidth = 1;
                    chartCtx.beginPath();
                    chartCtx.moveTo(pointEl.x, pointEl.y);
                    chartCtx.lineTo(chosen.x + labelW / 2, chosen.y + labelH / 2);
                    chartCtx.stroke();

                    // 白底标签框，避免与图形颜色混叠
                    chartCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    chartCtx.fillRect(chosen.x, chosen.y, labelW, labelH);
                    chartCtx.strokeStyle = 'rgba(209, 213, 219, 1)';
                    chartCtx.strokeRect(chosen.x, chosen.y, labelW, labelH);

                    chartCtx.fillStyle = '#1f2937';
                    chartCtx.fillText(label, chosen.x + padX, chosen.y + labelH / 2);
                });

                if (hiddenCount > 0) {
                    chartCtx.fillStyle = '#6b7280';
                    chartCtx.font = '11px sans-serif';
                    chartCtx.fillText(`已隐藏 ${hiddenCount} 个重叠标签`, chartArea.left + 6, chartArea.top + 12);
                }

                chartCtx.restore();
            }
        };

        this.charts.scoreDistribution = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'EPA-净胜分队伍分布',
                    data: points,
                    backgroundColor: pointColors,
                    borderColor: pointColors,
                    borderWidth: 1.5,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const raw = context.raw || {};
                                const start = (raw.bucket || 0) * 50;
                                const end = start + 49;
                                return `${raw.name || ''} | EPA: ${raw.epa || 0} | 净胜分: ${raw.netScore || 0} | 场次: ${raw.matches || 0} | 颜色段: ${start}-${end}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: axisMinX,
                        max: axisMaxX,
                        title: {
                            display: true,
                            text: '净胜分'
                        }
                    },
                    y: {
                        min: 0,
                        max: axisMaxEPA,
                        title: {
                            display: true,
                            text: 'EPA'
                        }
                    }
                }
            },
            plugins: [labelPlugin]
        });
    }

    updateAllCharts() {
        this.createTeamScoresChart();
        this.createScoreDistributionChart();
    }

    // 创建性能趋势图
    createPerformanceTrendChart(teamName) {
        const teamMatches = dataManager.matches
            .filter(m => m.teamName === teamName)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            labels: teamMatches.map((m, i) => `比赛 ${i + 1}`),
            data: teamMatches.map(m => m.score)
        };
    }
}

// 创建全局图表管理器实例
const chartsManager = new ChartsManager();
