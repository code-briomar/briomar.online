interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // API Route: Ratings
        if (url.pathname === '/api/ratings') {
            if (request.method === 'GET') {
                const postId = url.searchParams.get('postId') || 'why-mpesa-is-slow';
                const result = await env.DB.prepare(
                    `SELECT COUNT(*) as totalVotes, AVG(score) as avgScore FROM post_ratings WHERE post_id = ?`
                ).bind(postId).first<{ totalVotes: number; avgScore: number | null }>();

                const totalVotes = result?.totalVotes || 0;
                const avgScore = result?.avgScore ? Number(result.avgScore.toFixed(1)) : null;

                return new Response(JSON.stringify({ totalVotes, avgScore }), {
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
                });
            }

            if (request.method === 'POST') {
                const body: any = await request.json();
                const { postId = 'why-mpesa-is-slow', score, voterToken } = body;
                const numScore = parseInt(score, 10);
                if (isNaN(numScore) || numScore < 1 || numScore > 10) {
                    return new Response(JSON.stringify({ error: 'Score must be between 1 and 10' }), { status: 400 });
                }

                if (voterToken) {
                    const existing = await env.DB.prepare(
                        `SELECT id FROM post_ratings WHERE post_id = ? AND voter_token = ?`
                    ).bind(postId, voterToken).first<{ id: number }>();

                    if (existing) {
                        await env.DB.prepare(
                            `UPDATE post_ratings SET score = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?`
                        ).bind(numScore, existing.id).run();
                    } else {
                        await env.DB.prepare(
                            `INSERT INTO post_ratings (post_id, score, voter_token) VALUES (?, ?, ?)`
                        ).bind(postId, numScore, voterToken).run();
                    }
                } else {
                    await env.DB.prepare(
                        `INSERT INTO post_ratings (post_id, score, voter_token) VALUES (?, ?, ?)`
                    ).bind(postId, numScore, null).run();
                }

                const stats = await env.DB.prepare(
                    `SELECT COUNT(*) as totalVotes, AVG(score) as avgScore FROM post_ratings WHERE post_id = ?`
                ).bind(postId).first<{ totalVotes: number; avgScore: number | null }>();

                return new Response(JSON.stringify({
                    success: true,
                    totalVotes: stats?.totalVotes || 0,
                    avgScore: stats?.avgScore ? Number(stats.avgScore.toFixed(1)) : null
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // API Route: Comments
        if (url.pathname === '/api/comments') {
            if (request.method === 'GET') {
                const postId = url.searchParams.get('postId') || 'why-mpesa-is-slow';
                const { results } = await env.DB.prepare(
                    `SELECT id, author_name as name, author_handle as handle, score, comment_body as body, 
                            created_at as createdAt 
                     FROM post_comments 
                     WHERE post_id = ? 
                     ORDER BY id ASC`
                ).bind(postId).all<{
                    id: number;
                    name: string;
                    handle: string | null;
                    score: number | null;
                    body: string;
                    createdAt: string;
                }>();

                return new Response(JSON.stringify({ comments: results || [] }), {
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
                });
            }

            if (request.method === 'POST') {
                const body: any = await request.json();
                const { postId = 'why-mpesa-is-slow', name, handle, score, body: commentBody } = body;
                const trimmedName = (name || '').trim().slice(0, 50);
                const trimmedBody = (commentBody || '').trim().slice(0, 1000);
                const trimmedHandle = (handle || '').trim().slice(0, 50);
                const numScore = score ? parseInt(score, 10) : null;

                if (!trimmedName || !trimmedBody) {
                    return new Response(JSON.stringify({ error: 'Name and comment are required' }), { status: 400 });
                }

                await env.DB.prepare(
                    `INSERT INTO post_comments (post_id, author_name, author_handle, score, comment_body) 
                     VALUES (?, ?, ?, ?, ?)`
                ).bind(
                    postId,
                    trimmedName,
                    trimmedHandle || null,
                    (numScore && !isNaN(numScore)) ? numScore : null,
                    trimmedBody
                ).run();

                return new Response(JSON.stringify({
                    success: true,
                    comment: {
                        name: trimmedName,
                        handle: trimmedHandle,
                        score: numScore ? numScore.toString() : '',
                        body: trimmedBody,
                        date: 'Just now'
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // All other paths serve static Astro assets from ./dist
        return env.ASSETS.fetch(request);
    }
};
