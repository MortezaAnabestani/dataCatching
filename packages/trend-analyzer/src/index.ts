import fs from 'fs';
import path from 'path';

const PERSIAN_STOP_WORDS = new Set([
    'و', 'در', 'به', 'از', 'که', 'این', 'را', 'با', 'است', 'برای', 'آن',
    'یک', 'تا', 'بر', 'خود', 'دیگر', 'پس', 'هم', 'شد',
    'اگر', 'همه', 'نه', 'من', 'تو', 'او', 'ما', 'شما', 'ایشان',
    'بود', 'شد', 'کرد', 'گفت', 'اما', 'ولی', 'چون', 'زیرا',
    'باید', 'شاید', 'هر', 'هیچ', 'پیش', 'پس', 'روی', 'زیر',
    'بسیار', 'کم', 'بیش', 'حتی', 'یا',
    '.', ',', '،', ':', '؛', '؟', '!', '(', ')', '[', ']', '{', '}', '"', "'",
    'گزارش', 'خبر', 'افزود', 'کرد', 'ادامه', 'داد', 'عنوان', 'اشاره',
    'گفت', 'اظهار', 'داشت', 'تصریح', 'مطرح', 'خاطرنشان'
]);

interface Article {
    source: string;
    title: string;
    content: string;
    url: string;
    published_at: string;
}

interface Trend {
    topic: string;
    score: number;
}

interface TrendWindow {
    window_start: string;
    trends: Trend[];
}

function extractKeywords(text: string): string[] {
    if (!text) return [];
    const words = text.replace(/[.,:؛؟!(){}\[\]]/g, ' ').split(/\s+/);
    return words.filter(word => word.length > 2 && !PERSIAN_STOP_WORDS.has(word));
}

function getKeywordFrequency(keywords: string[]): Map<string, number> {
    const frequencyMap = new Map<string, number>();
    for (const keyword of keywords) {
        frequencyMap.set(keyword, (frequencyMap.get(keyword) || 0) + 1);
    }
    return frequencyMap;
}

function scoreTrends(current: Map<string, number>, previous: Map<string, number>, articlesInWindow: Article[]): Map<string, number> {
    const scores = new Map<string, number>();
    for (const [keyword, currentFreq] of current.entries()) {
        const prevFreq = previous.get(keyword) || 0;
        const acceleration = currentFreq - prevFreq;
        const sources = new Set(articlesInWindow
            .filter(article => (article.title + ' ' + article.content).includes(keyword))
            .map(article => article.source)
        );
        const sourceDiversity = sources.size;
        const score = (currentFreq * 0.5) + (acceleration * 1.5) + (sourceDiversity * 2.0);
        if (score > 2) {
            scores.set(keyword, score);
        }
    }
    return scores;
}

async function analyzeAndSaveTrends() {
    const dataPath = path.join(__dirname, '../sample.json');
    const outputPath = path.join(__dirname, '../../../apps/web/public/trends.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const articles: Article[] = JSON.parse(rawData);

    articles.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());

    if (articles.length === 0) {
        console.log('No articles to analyze.');
        return;
    }

    const windowSizeMs = 6 * 60 * 60 * 1000;
    const firstArticleTime = new Date(articles[0].published_at).getTime();
    const lastArticleTime = new Date(articles[articles.length - 1].published_at).getTime();

    let previousWindowKeywords = new Map<string, number>();
    const allTrendWindows: TrendWindow[] = [];

    for (let currentTime = firstArticleTime; currentTime <= lastArticleTime; currentTime += windowSizeMs) {
        const windowEnd = currentTime + windowSizeMs;
        const articlesInWindow = articles.filter(a => {
            const articleTime = new Date(a.published_at).getTime();
            return articleTime >= currentTime && articleTime < windowEnd;
        });

        if (articlesInWindow.length === 0) continue;

        const allKeywordsInWindow = articlesInWindow.flatMap(a => extractKeywords(a.title + ' ' + a.content));
        const currentWindowKeywords = getKeywordFrequency(allKeywordsInWindow);
        const trendScores = scoreTrends(currentWindowKeywords, previousWindowKeywords, articlesInWindow);

        const sortedTrends = [...trendScores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // Take top 5 trends
            .map(([topic, score]) => ({ topic, score: parseFloat(score.toFixed(2)) }));

        if (sortedTrends.length > 0) {
            allTrendWindows.push({
                window_start: new Date(currentTime).toISOString(),
                trends: sortedTrends,
            });
        }

        previousWindowKeywords = currentWindowKeywords;
    }

    fs.writeFileSync(outputPath, JSON.stringify(allTrendWindows, null, 2));
    console.log(`Trend analysis complete. Results saved to ${outputPath}`);
}

analyzeAndSaveTrends().catch(console.error);
