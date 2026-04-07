// 数据管理模块
class DataManager {
    constructor() {
        this.teams = [];
        this.matches = [];
        this.competitiveTeams = [];
        this.competitiveMatchCount = 0;
        this.competitiveMatches = [];
        this.loadFromLocalStorage();
    }

    // 从本地存储加载数据
    loadFromLocalStorage() {
        const savedTeams = localStorage.getItem('makex_teams');
        const savedMatches = localStorage.getItem('makex_matches');
        const savedCompetitiveTeams = localStorage.getItem('makex_competitive_teams');
        const savedCompetitiveMatchCount = localStorage.getItem('makex_competitive_match_count');
        const savedCompetitiveMatches = localStorage.getItem('makex_competitive_matches');
        
        if (savedTeams) {
            this.teams = JSON.parse(savedTeams);
        }
        if (savedMatches) {
            this.matches = JSON.parse(savedMatches);
        }
        if (savedCompetitiveTeams) {
            this.competitiveTeams = JSON.parse(savedCompetitiveTeams);
        }
        if (savedCompetitiveMatchCount) {
            this.competitiveMatchCount = parseInt(savedCompetitiveMatchCount, 10) || 0;
        }
        if (savedCompetitiveMatches) {
            this.competitiveMatches = JSON.parse(savedCompetitiveMatches);
        }
    }

    // 保存到本地存储
    saveToLocalStorage() {
        localStorage.setItem('makex_teams', JSON.stringify(this.teams));
        localStorage.setItem('makex_matches', JSON.stringify(this.matches));
        localStorage.setItem('makex_competitive_teams', JSON.stringify(this.competitiveTeams));
        localStorage.setItem('makex_competitive_match_count', String(this.competitiveMatchCount || 0));
        localStorage.setItem('makex_competitive_matches', JSON.stringify(this.competitiveMatches || []));
    }

    getTeamAllianceMatches(teamName) {
        if (!teamName || !this.competitiveMatches.length) {
            return [];
        }

        return this.competitiveMatches
            .filter((m) => (m.redTeams || []).includes(teamName) || (m.blueTeams || []).includes(teamName))
            .map((m) => {
                const isRed = (m.redTeams || []).includes(teamName);
                const allies = isRed ? m.redTeams : m.blueTeams;
                const opponents = isRed ? m.blueTeams : m.redTeams;
                const myScore = isRed ? m.redScore : m.blueScore;
                const oppScore = isRed ? m.blueScore : m.redScore;

                return {
                    matchNo: m.matchNo,
                    side: isRed ? '红方联盟' : '蓝方联盟',
                    allies: (allies || []).filter((t) => t !== teamName),
                    opponents: opponents || [],
                    myScore: Number(myScore || 0),
                    oppScore: Number(oppScore || 0),
                    result: Number(myScore || 0) > Number(oppScore || 0)
                        ? '胜'
                        : (Number(myScore || 0) < Number(oppScore || 0) ? '负' : '平')
                };
            })
            .sort((a, b) => (a.matchNo || 0) - (b.matchNo || 0));
    }

    getCompetitiveMatchCount() {
        if (this.competitiveMatchCount > 0) {
            return this.competitiveMatchCount;
        }

        if (!this.competitiveTeams.length) {
            return 0;
        }

        // 联盟赛每场涉及4支队伍（红1红2 vs 蓝1蓝2）
        const teamMatchTotal = this.competitiveTeams.reduce((sum, t) => {
            const m = Number(t.matches || ((t.wins || 0) + (t.losses || 0)) || 0);
            return sum + m;
        }, 0);

        return Math.floor(teamMatchTotal / 4);
    }

    // 添加队伍
    addTeam(name) {
        const team = {
            id: Date.now(),
            name: name,
            totalScore: 0,
            matches: 0,
            highestScore: 0
        };
        this.teams.push(team);
        this.saveToLocalStorage();
        return team;
    }

    // 添加比赛结果
    addMatch(match) {
        match.id = Date.now();
        this.matches.push(match);
        
        // 更新队伍数据
        const team = this.teams.find(t => t.name === match.teamName);
        if (team) {
            team.matches++;
            team.totalScore += match.score;
            team.highestScore = Math.max(team.highestScore, match.score);
        }
        
        this.saveToLocalStorage();
        return match;
    }

    // 获取队伍统计
    getTeamStats() {
        return this.teams.map(team => ({
            ...team,
            avgScore: team.matches > 0 ? (team.totalScore / team.matches).toFixed(2) : 0
        })).sort((a, b) => b.totalScore - a.totalScore);
    }

    // 获取总体统计
    getOverallStats() {
        if (this.competitiveTeams.length > 0) {
            const ranked = this.getRankingData('composite');
            const totalTeams = ranked.length;
            const totalMatches = this.getCompetitiveMatchCount();
            const epaValues = ranked.map(t => Number(t.epa || 0));
            const avgScore = epaValues.length > 0
                ? (epaValues.reduce((sum, v) => sum + v, 0) / epaValues.length).toFixed(2)
                : 0;
            const maxScore = epaValues.length > 0
                ? Math.max(...epaValues).toFixed(2)
                : 0;

            return {
                totalTeams,
                totalMatches,
                avgScore,
                maxScore
            };
        }

        const totalTeams = this.teams.length;
        const totalMatches = this.matches.length;
        const avgScore = totalMatches > 0 
            ? (this.matches.reduce((sum, m) => sum + m.score, 0) / totalMatches).toFixed(2)
            : 0;
        const maxScore = totalMatches > 0 
            ? Math.max(...this.matches.map(m => m.score))
            : 0;

        return {
            totalTeams,
            totalMatches,
            avgScore,
            maxScore
        };
    }

    // 获取EPA排名：每场联盟分数由两支队伍平分，再按参赛场次取平均
    getEPARanking(limit = null) {
        if (this.competitiveTeams.length > 0) {
            const ranked = this.competitiveTeams.map((team) => {
                const matches = Number(team.matches || ((team.wins || 0) + (team.losses || 0)) || 0);
                const totalSharedScore = Number(team.totalScore || 0) / 2;
                const epa = matches > 0 ? (totalSharedScore / matches) : 0;

                return {
                    name: team.team,
                    matches,
                    epa
                };
            }).sort((a, b) => b.epa - a.epa);

            const visible = Number.isInteger(limit) && limit > 0 ? ranked.slice(0, limit) : ranked;
            return visible.map((team, idx) => ({
                rank: idx + 1,
                name: team.name,
                matches: team.matches,
                epa: team.epa.toFixed(2)
            }));
        }

        const epaMap = new Map();
        this.matches.forEach((match) => {
            if (!match.teamName) return;

            const current = epaMap.get(match.teamName) || {
                name: match.teamName,
                matches: 0,
                totalSharedScore: 0
            };

            current.matches += 1;
            current.totalSharedScore += Number(match.score || 0) / 2;
            epaMap.set(match.teamName, current);
        });

        const ranked = Array.from(epaMap.values()).map((team) => ({
            name: team.name,
            matches: team.matches,
            epa: team.matches > 0 ? (team.totalSharedScore / team.matches) : 0
        })).sort((a, b) => b.epa - a.epa);

        const visible = Number.isInteger(limit) && limit > 0 ? ranked.slice(0, limit) : ranked;
        return visible.map((team, idx) => ({
            rank: idx + 1,
            name: team.name,
            matches: team.matches,
            epa: team.epa.toFixed(2)
        }));
    }

    // 加载示例数据
    loadSampleData() {
        this.teams = [];
        this.matches = [];
        this.competitiveTeams = [];
        this.competitiveMatchCount = 0;
        this.competitiveMatches = [];

        // 示例队伍
        const teamNames = [
            'Alpha Robotics', 'Beta Team', 'Gamma Force', 
            'Delta Engineers', 'Epsilon Builders', 'Zeta Masters',
            'Eta Innovators', 'Theta Alliance'
        ];

        teamNames.forEach(name => this.addTeam(name));

        // 示例比赛数据
        const categories = ['auto', 'tele', 'endgame'];
        for (let i = 0; i < 20; i++) {
            const teamName = teamNames[Math.floor(Math.random() * teamNames.length)];
            const match = {
                teamName: teamName,
                score: Math.floor(Math.random() * 350) + 50,
                category: categories[Math.floor(Math.random() * categories.length)],
                date: new Date(2026, 3, Math.floor(Math.random() * 8) + 1).toLocaleDateString('zh-CN'),
                details: {
                    auto: Math.floor(Math.random() * 100),
                    tele: Math.floor(Math.random() * 150),
                    endgame: Math.floor(Math.random() * 100)
                }
            };
            this.addMatch(match);
        }

        return true;
    }

    // 清除所有数据
    clearAllData() {
        this.teams = [];
        this.matches = [];
        this.competitiveTeams = [];
        this.competitiveMatchCount = 0;
        this.competitiveMatches = [];
        localStorage.removeItem('makex_teams');
        localStorage.removeItem('makex_matches');
        localStorage.removeItem('makex_competitive_teams');
        localStorage.removeItem('makex_competitive_match_count');
        localStorage.removeItem('makex_competitive_matches');
    }

    // 搜索队伍
    searchTeams(keyword) {
        return this.getTeamStats().filter(team => 
            team.name.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    // 搜索比赛
    searchMatches(keyword) {
        return this.matches.filter(match =>
            match.teamName.toLowerCase().includes(keyword.toLowerCase()) ||
            match.category.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    // 导入JSON数据
    importJSON(data) {
        try {
            if (data.teams && Array.isArray(data.teams)) {
                this.teams = data.teams;
            }
            if (data.matches && Array.isArray(data.matches)) {
                this.matches = data.matches;
            }
            if (data.competitiveTeams && Array.isArray(data.competitiveTeams)) {
                this.competitiveTeams = data.competitiveTeams;
            }
            if (data.competitiveMatches && Array.isArray(data.competitiveMatches)) {
                this.competitiveMatches = data.competitiveMatches;
            }
            this.competitiveMatchCount = parseInt(data.competitiveMatchCount, 10)
                || this.getCompetitiveMatchCount()
                || 0;
            this.saveToLocalStorage();
            return true;
        } catch (error) {
            console.error('Error importing JSON:', error);
            return false;
        }
    }

    // 导出JSON数据
    exportJSON() {
        return {
            teams: this.teams,
            matches: this.matches,
            competitiveTeams: this.competitiveTeams,
            competitiveMatchCount: this.competitiveMatchCount,
            competitiveMatches: this.competitiveMatches,
            exportDate: new Date().toISOString()
        };
    }

    importCompetitiveTeams(teams, matchCount = null, competitiveMatches = []) {
        this.competitiveTeams = teams;
        this.competitiveMatchCount = parseInt(matchCount, 10)
            || Math.floor(teams.reduce((sum, t) => sum + Number(t.matches || 0), 0) / 4)
            || 0;
        this.competitiveMatches = Array.isArray(competitiveMatches) ? competitiveMatches : [];
        this.teams = teams.map((t, idx) => ({
            id: idx + 1,
            name: t.team,
            totalScore: t.totalScore || 0,
            matches: t.matches || 0,
            highestScore: t.points || 0
        }));
        this.matches = [];
        this.saveToLocalStorage();
    }

    // 获取排名数据（包含胜负分和净胜分）
    getRankingData(sortBy = 'composite') {
        if (this.competitiveTeams.length > 0) {
            const enriched = this.competitiveTeams.map((team) => {
                const totalMatches = (team.wins || 0) + (team.losses || 0);
                const epa = totalMatches > 0
                    ? ((team.totalScore || 0) / totalMatches / 2).toFixed(2)
                    : '0.00';

                return {
                    name: team.team,
                    team: team.team,
                    wins: team.wins || 0,
                    losses: team.losses || 0,
                    totalWinLossScore: team.points || 0,
                    totalScore: team.totalScore || 0,
                    netScore: team.netScore || 0,
                    matches: team.matches || 0,
                    totalMatches,
                    epa,
                    winRate: totalMatches > 0
                        ? ((team.wins || 0) / totalMatches * 100).toFixed(1)
                        : '0.0'
                };
            });

            const normalizedSort = sortBy === 'wins' ? 'totalWinLossScore' : sortBy;
            return enriched.sort((a, b) => {
                let av = 0;
                let bv = 0;

                if (normalizedSort === 'netScore') {
                    av = a.netScore;
                    bv = b.netScore;
                } else if (normalizedSort === 'totalScore') {
                    av = a.totalScore;
                    bv = b.totalScore;
                } else {
                    av = a.totalWinLossScore;
                    bv = b.totalWinLossScore;
                }

                if (bv !== av) return bv - av;
                if (b.netScore !== a.netScore) return b.netScore - a.netScore;
                if (b.wins !== a.wins) return b.wins - a.wins;
                return b.totalScore - a.totalScore;
            });
        }

        const ranking = {};

        // 初始化所有队伍的统计数据
        this.teams.forEach(team => {
            ranking[team.name] = {
                name: team.name,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                totalScore: 0,
                matches: 0,
                highestScore: 0
            };
        });

        // 计算胜负统计（基于分数对比）
        const processed = new Set();
        this.matches.forEach(match => {
            if (ranking[match.teamName]) {
                ranking[match.teamName].pointsFor += match.score;
                ranking[match.teamName].totalScore += match.score;
                ranking[match.teamName].matches++;
                ranking[match.teamName].highestScore = Math.max(
                    ranking[match.teamName].highestScore,
                    match.score
                );
            }
        });

        // 模拟比赛对手和胜负关系（基于分数）
        for (let i = 0; i < this.matches.length; i++) {
            for (let j = i + 1; j < this.matches.length; j++) {
                const match1 = this.matches[i];
                const match2 = this.matches[j];
                const key = [match1.teamName, match2.teamName].sort().join('-');

                if (!processed.has(key) && match1.date === match2.date) {
                    processed.add(key);
                    
                    if (match1.score > match2.score) {
                        if (ranking[match1.teamName]) ranking[match1.teamName].wins++;
                        if (ranking[match2.teamName]) ranking[match2.teamName].losses++;
                        if (ranking[match2.teamName]) ranking[match2.teamName].pointsAgainst += match1.score;
                        if (ranking[match1.teamName]) ranking[match1.teamName].pointsAgainst += match2.score;
                    } else if (match2.score > match1.score) {
                        if (ranking[match2.teamName]) ranking[match2.teamName].wins++;
                        if (ranking[match1.teamName]) ranking[match1.teamName].losses++;
                        if (ranking[match1.teamName]) ranking[match1.teamName].pointsAgainst += match2.score;
                        if (ranking[match2.teamName]) ranking[match2.teamName].pointsAgainst += match1.score;
                    }
                }
            }
        }

        // 转换为数组并计算净胜分
        let rankingArray = Object.values(ranking).map(team => ({
            ...team,
            netScore: team.pointsFor - team.pointsAgainst,
            avgScore: team.matches > 0 ? (team.totalScore / team.matches).toFixed(2) : 0
        }));

        // 排序
        if (sortBy === 'wins') {
            rankingArray.sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                return b.netScore - a.netScore;
            });
        } else if (sortBy === 'netScore') {
            rankingArray.sort((a, b) => b.netScore - a.netScore);
        } else if (sortBy === 'totalScore') {
            rankingArray.sort((a, b) => b.totalScore - a.totalScore);
        } else {
            // composite: 综合排序
            rankingArray.sort((a, b) => {
                const scoreA = (b.wins - a.wins) * 1000 + (b.netScore - a.netScore);
                const scoreB = 0;
                return scoreA - scoreB;
            });
        }

        return rankingArray;
    }

    // 生成淘汰赛对阵
    generateBracket(topN = 4) {
        const ranking = this.getRankingData('composite');
        const topTeams = ranking.slice(0, topN);

        if (topTeams.length < topN) {
            return null; // 队伍数量不足
        }

        const bracket = {
            round1: [],
            finals: null
        };

        // 生成首轮对阵
        for (let i = 0; i < topTeams.length; i += 2) {
            if (i + 1 < topTeams.length) {
                bracket.round1.push({
                    team1: topTeams[i],
                    team2: topTeams[i + 1],
                    winner: null
                });
            }
        }

        return bracket;
    }
}

// 创建全局数据管理器实例
const dataManager = new DataManager();
