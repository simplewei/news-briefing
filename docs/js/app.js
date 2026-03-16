// NewsBrief - Web App Logic
// Uses RSS feeds + CORS proxies to fetch news without any backend

const CONFIG = {
    domains: {
        geopolitics: { label: '🌍 地缘政治', keywords: ['war','conflict','diplomacy','sanctions','military','summit','UN','nato','战争','冲突','外交','制裁','联合国','军事'] },
        tech:        { label: '💻 科技', keywords: ['AI','tech','chip','semiconductor','software','robot','quantum','人工智能','芯片','科技','软件','量子','机器人'] },
        economy:     { label: '📈 经济', keywords: ['economy','gdp','trade','inflation','tariff','export','经济','贸易','通胀','出口','关税','GDP'] },
        energy:      { label: '⚡ 能源', keywords: ['oil','gas','solar','wind','nuclear','energy','renewable','石油','天然气','光伏','风电','核能','新能源'] },
        health:      { label: '🏥 健康', keywords: ['health','vaccine','drug','pharma','medical','pandemic','医疗','疫苗','药物','生物','临床','健康'] },
        finance:     { label: '💰 金融', keywords: ['bank','stock','market','crypto','bitcoin','central bank','银行','股市','央行','加密','货币','金融'] },
        climate:     { label: '🌿 气候', keywords: ['climate','carbon','weather','emission','warming','环境','气候','碳排放','极端天气','碳中和'] },
        defense:     { label: '🛡️ 军事', keywords: ['defense','weapon','missile','navy','air force','fighter','国防','武器','导弹','海军','军演','战斗机'] }
    },
    
    // RSS feeds - free, no API key needed
    rssFeeds: {
        zh: [
            { name: '新华网', region: '🇨🇳 权威', url: 'https://www.news.cn/rss/politics.xml', lang: 'zh' },
            { name: '新华网-国际', region: '🇨🇳 权威', url: 'https://www.news.cn/rss/world.xml', lang: 'zh' },
            { name: '新华网-财经', region: '🇨🇳 权威', url: 'https://www.news.cn/rss/fortune.xml', lang: 'zh' },
            { name: '新华网-科技', region: '🇨🇳 权威', url: 'https://www.news.cn/rss/tech.xml', lang: 'zh' },
            { name: '环球网', region: '🇨🇳 权威', url: 'https://www.globaltimes.cn/rss/outbrain.xml', lang: 'zh' },
            { name: '联合早报', region: '🌏 海外中文', url: 'https://www.zaobao.com.sg/rss', lang: 'zh' },
            { name: '南华早报', region: '🌏 海外中文', url: 'https://www.scmp.com/rss/91/feed', lang: 'zh' },
        ],
        en: [
            { name: 'Reuters', region: '🇺🇸 美国', url: 'https://www.reutersagency.com/feed/', lang: 'en' },
            { name: 'AP News', region: '🇺🇸 美国', url: 'https://rsshub.app/apnews/topics/apf-topnews', lang: 'en' },
            { name: 'Bloomberg', region: '🇺🇸 美国', url: 'https://rsshub.app/bloomberg', lang: 'en' },
            { name: 'CNN', region: '🇺🇸 美国', url: 'https://rsshub.app/cnn/top', lang: 'en' },
            { name: 'NYT', region: '🇺🇸 美国', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', lang: 'en' },
            { name: 'BBC', region: '🇬🇧 英国', url: 'https://rsshub.app/bbc', lang: 'en' },
            { name: 'Guardian', region: '🇬🇧 英国', url: 'https://www.theguardian.com/world/rss', lang: 'en' },
            { name: 'FT', region: '🇬🇧 英国', url: 'https://rsshub.app/ft', lang: 'en' },
            { name: 'Al Jazeera', region: '🌍 国际', url: 'https://www.aljazeera.com/xml/rss/all.xml', lang: 'en' },
            { name: 'Nikkei Asia', region: '🌍 国际', url: 'https://rsshub.app/nikkei/asia', lang: 'en' },
            { name: 'DW', region: '🌍 国际', url: 'https://rsshub.app/dw/en', lang: 'en' },
        ]
    },
    
    // CORS proxies for fetching RSS
    corsProxies: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ]
};

// State
let state = {
    selectedDomains: new Set(['tech']),
    selectedLang: 'all',
    selectedMedia: new Set(),
    selectedSchedule: 'instant',
    allArticles: [],
    isGenerating: false
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    renderDomainChips();
    renderMediaList();
    preselectMedia();
});

function renderDomainChips() {
    const container = document.getElementById('domainChips');
    container.innerHTML = Object.entries(CONFIG.domains).map(([id, d]) => 
        `<div class="chip ${state.selectedDomains.has(id)?'active':''}" data-domain="${id}" onclick="toggleDomain(this)">
            <span class="chip-icon">${d.label.split(' ')[0]}</span>${d.label.split(' ').slice(1).join(' ')}
        </div>`
    ).join('');
}

function renderMediaList() {
    const container = document.getElementById('mediaList');
    let html = '';
    
    const allFeeds = [...CONFIG.rssFeeds.zh, ...CONFIG.rssFeeds.en];
    const regions = [...new Set(allFeeds.map(f => f.region))];
    
    regions.forEach(region => {
        const feeds = allFeeds.filter(f => f.region === region);
        const langTag = feeds[0].lang;
        const visible = state.selectedLang === 'all' || state.selectedLang === langTag;
        
        html += `<div class="media-group" data-lang="${langTag}" style="display:${visible?'block':'none'}">
            <div class="media-group-title">${region}</div>
            <div class="media-items">
                ${feeds.map(f => `<div class="media-chip ${state.selectedMedia.has(f.name)?'active':''}" 
                    data-media="${f.name}" data-lang="${f.lang}" onclick="toggleMedia(this)">${f.name}</div>`).join('')}
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

function preselectMedia() {
    // Pre-select a good default mix
    ['新华社-科技', 'Reuters', 'BBC', 'CNN'].forEach(m => {
        const allNames = [...CONFIG.rssFeeds.zh, ...CONFIG.rssFeeds.en].map(f => f.name);
        if (allNames.includes(m)) state.selectedMedia.add(m);
    });
    // Also select all zh feeds by default
    CONFIG.rssFeeds.zh.forEach(f => state.selectedMedia.add(f.name));
    renderMediaList();
}

// ========== TOGGLE HANDLERS ==========
function toggleDomain(el) {
    const id = el.dataset.domain;
    if (state.selectedDomains.has(id)) {
        if (state.selectedDomains.size > 1) state.selectedDomains.delete(id);
    } else {
        state.selectedDomains.add(id);
    }
    el.classList.toggle('active', state.selectedDomains.has(id));
}

function toggleLang(el) {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    state.selectedLang = el.dataset.lang;
    
    // Show/hide media groups
    document.querySelectorAll('.media-group').forEach(g => {
        const lang = g.dataset.lang;
        g.style.display = (state.selectedLang === 'all' || state.selectedLang === lang) ? 'block' : 'none';
    });
    
    // Auto-select/deselect media based on language filter
    if (state.selectedLang === 'zh') {
        CONFIG.rssFeeds.en.forEach(f => state.selectedMedia.delete(f.name));
        CONFIG.rssFeeds.zh.forEach(f => state.selectedMedia.add(f.name));
    } else if (state.selectedLang === 'en') {
        CONFIG.rssFeeds.zh.forEach(f => state.selectedMedia.delete(f.name));
        CONFIG.rssFeeds.en.forEach(f => state.selectedMedia.add(f.name));
    }
    renderMediaList();
}

function toggleMedia(el) {
    const name = el.dataset.media;
    if (state.selectedMedia.has(name)) {
        state.selectedMedia.delete(name);
    } else {
        state.selectedMedia.add(name);
    }
    el.classList.toggle('active', state.selectedMedia.has(name));
}

function toggleSchedule(el) {
    document.querySelectorAll('.schedule-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    state.selectedSchedule = el.dataset.schedule;
}

// ========== RSS FETCHING ==========
async function fetchRSS(url) {
    for (const proxy of CONFIG.corsProxies) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            
            const res = await fetch(proxy + encodeURIComponent(url), { signal: controller.signal });
            clearTimeout(timeout);
            
            if (!res.ok) continue;
            const text = await res.text();
            return parseRSS(text);
        } catch (e) {
            continue;
        }
    }
    return [];
}

function parseRSS(xml) {
    const articles = [];
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        
        // Try RSS 2.0 format
        let items = doc.querySelectorAll('item');
        // Try Atom format
        if (items.length === 0) items = doc.querySelectorAll('entry');
        
        items.forEach((item, i) => {
            if (i >= 15) return; // Limit per feed
            
            const title = item.querySelector('title')?.textContent?.trim() || '';
            const link = item.querySelector('link')?.textContent?.trim() || 
                         item.querySelector('link')?.getAttribute('href') || '';
            const desc = item.querySelector('description')?.textContent?.trim() ||
                         item.querySelector('summary')?.textContent?.trim() || '';
            const pubDate = item.querySelector('pubDate')?.textContent?.trim() ||
                            item.querySelector('published')?.textContent?.trim() ||
                            item.querySelector('updated')?.textContent?.trim() || '';
            
            if (title) {
                articles.push({
                    title: stripHtml(title),
                    link,
                    summary: stripHtml(desc).slice(0, 300),
                    date: parseDate(pubDate),
                    rawDate: pubDate
                });
            }
        });
    } catch (e) {
        console.warn('RSS parse error:', e);
    }
    return articles;
}

function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function parseDate(str) {
    if (!str) return new Date().toISOString();
    try {
        return new Date(str).toISOString();
    } catch {
        return new Date().toISOString();
    }
}

// ========== DOMAIN MATCHING ==========
function matchesDomain(article, domainIds) {
    const text = (article.title + ' ' + article.summary).toLowerCase();
    return domainIds.some(id => {
        const domain = CONFIG.domains[id];
        return domain.keywords.some(kw => text.includes(kw.toLowerCase()));
    });
}

// ========== BRIEFING GENERATION ==========
async function generateBriefing() {
    if (state.isGenerating) return;
    if (state.selectedMedia.size === 0) {
        showToast('请至少选择一个媒体源', 'error');
        return;
    }
    
    state.isGenerating = true;
    const btn = document.getElementById('generateBtn');
    btn.classList.add('loading');
    btn.disabled = true;
    
    showStatus('working', '正在抓取 RSS 源...');
    
    try {
        // 1. Fetch all selected RSS feeds
        const allFeeds = [...CONFIG.rssFeeds.zh, ...CONFIG.rssFeeds.en];
        const selectedFeeds = allFeeds.filter(f => state.selectedMedia.has(f.name));
        
        let allArticles = [];
        let fetchCount = 0;
        
        const fetchPromises = selectedFeeds.map(async (feed) => {
            showStatus('working', `正在抓取 ${feed.name}... (${++fetchCount}/${selectedFeeds.length})`);
            const articles = await fetchRSS(feed.url);
            return articles.map(a => ({
                ...a,
                source: feed.name,
                sourceLang: feed.lang,
                region: feed.region
            }));
        });
        
        const results = await Promise.allSettled(fetchPromises);
        results.forEach(r => {
            if (r.status === 'fulfilled') {
                allArticles.push(...r.value);
            }
        });
        
        showStatus('working', '正在分析和过滤...');
        
        // 2. Filter by domain
        const domainIds = Array.from(state.selectedDomains);
        const filtered = allArticles.filter(a => matchesDomain(a, domainIds));
        
        // If too few matches, include all (broad search)
        const finalArticles = filtered.length >= 5 ? filtered : allArticles;
        
        // 3. Deduplicate by title similarity
        const deduped = deduplicate(finalArticles);
        
        // 4. Sort by date (newest first)
        deduped.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 5. Take top articles
        const topArticles = deduped.slice(0, 20);
        state.allArticles = topArticles;
        
        // 6. Generate briefing
        renderBriefing(topArticles, domainIds);
        
        showStatus('done', `简报已生成 · ${topArticles.length} 条新闻 · ${selectedFeeds.length} 个源`);
        showToast('简报生成成功！', 'success');
        
    } catch (e) {
        console.error('Generation error:', e);
        showStatus('error', '生成失败: ' + e.message);
        showToast('生成失败，请重试', 'error');
    } finally {
        state.isGenerating = false;
        btn.classList.remove('loading');
        btn.disabled = false;
        setTimeout(() => hideStatus(), 5000);
    }
}

function deduplicate(articles) {
    const seen = new Set();
    return articles.filter(a => {
        // Simple dedup: normalize title
        const key = a.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '').slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ========== RENDERING ==========
function renderBriefing(articles, domainIds) {
    const container = document.getElementById('briefingOutput');
    const emptyState = document.getElementById('emptyState');
    
    emptyState.style.display = 'none';
    container.classList.add('visible');
    
    const domainLabels = domainIds.map(id => CONFIG.domains[id].label).join(' · ');
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
    
    // Split by source language
    const zhArticles = articles.filter(a => a.sourceLang === 'zh');
    const enArticles = articles.filter(a => a.sourceLang === 'en');
    
    // Top 5 for "要闻"
    const topNews = articles.slice(0, 5);
    
    container.innerHTML = `
        <div class="briefing-meta">
            <div class="briefing-tags">
                <span class="briefing-tag">${domainLabels}</span>
                <span class="briefing-tag">📅 ${dateStr}</span>
                <span class="briefing-tag">📡 ${new Set(articles.map(a=>a.source)).size} 个源</span>
                <span class="briefing-tag">📄 ${articles.length} 条</span>
            </div>
            <div class="briefing-actions">
                <button class="action-btn" onclick="copyBriefing()">📋 复制</button>
                <button class="action-btn" onclick="downloadBriefing()">💾 下载</button>
            </div>
        </div>
        
        <!-- 今日要闻 -->
        <div class="section">
            <div class="section-header">
                <span class="section-title">📋 今日要闻</span>
                <span class="section-count">${topNews.length} 条</span>
            </div>
            <div class="section-body">
                ${topNews.map(a => renderNewsItem(a)).join('')}
            </div>
        </div>
        
        <!-- 更多新闻 -->
        ${articles.length > 5 ? `
        <div class="section">
            <div class="section-header">
                <span class="section-title">📰 更多新闻</span>
                <span class="section-count">${articles.length - 5} 条</span>
            </div>
            <div class="section-body">
                ${articles.slice(5).map(a => renderNewsItem(a)).join('')}
            </div>
        </div>` : ''}
        
        <!-- 来源分布 -->
        <div class="section">
            <div class="section-header">
                <span class="section-title">📊 来源分布</span>
            </div>
            <div class="section-body">
                ${renderSourceStats(articles)}
            </div>
        </div>
    `;
    
    // Scroll to top of main content
    document.getElementById('mainContent').scrollTop = 0;
}

function renderNewsItem(article) {
    const langClass = article.sourceLang === 'zh' ? 'zh' : 'en';
    const timeAgo = getTimeAgo(article.date);
    const link = article.link ? `<a href="${article.link}" target="_blank" rel="noopener">${article.title}</a>` : article.title;
    
    return `<div class="news-item">
        <div class="news-header">
            <span class="news-source-badge ${langClass}">${article.source}</span>
            <span class="news-time">${timeAgo}</span>
        </div>
        <div class="news-title">${link}</div>
        ${article.summary ? `<div class="news-summary">${article.summary.slice(0, 150)}...</div>` : ''}
    </div>`;
}

function renderSourceStats(articles) {
    const counts = {};
    articles.forEach(a => {
        counts[a.source] = (counts[a.source] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    
    return `<div style="display:flex;flex-direction:column;gap:8px;">
        ${sorted.map(([source, count]) => `
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="min-width:100px;font-size:13px;">${source}</span>
                <div style="flex:1;height:20px;background:var(--bg3);border-radius:4px;overflow:hidden;">
                    <div style="width:${(count/max)*100}%;height:100%;background:var(--accent);border-radius:4px;transition:width 0.5s;"></div>
                </div>
                <span style="font-size:12px;color:var(--text2);min-width:30px;">${count}</span>
            </div>
        `).join('')}
    </div>`;
}

function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN');
}

// ========== EXPORT ==========
function copyBriefing() {
    const text = document.getElementById('briefingOutput').innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板', 'success');
    });
}

function downloadBriefing() {
    const text = document.getElementById('briefingOutput').innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `news-briefing-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已下载', 'success');
}

// ========== UI HELPERS ==========
function showStatus(type, text) {
    const bar = document.getElementById('statusBar');
    const dot = document.getElementById('statusDot');
    const label = document.getElementById('statusText');
    bar.classList.add('visible');
    dot.className = 'status-dot ' + type;
    label.textContent = text;
}

function hideStatus() {
    document.getElementById('statusBar').classList.remove('visible');
}

function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}
