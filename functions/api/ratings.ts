interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const url = new URL(context.request.url);
        const postId = url.searchParams.get('postId') || 'why-mpesa-is-slow';

        const result = await context.env.DB.prepare(
            `SELECT COUNT(*) as totalVotes, AVG(score) as avgScore FROM post_ratings WHERE post_id = ?`
        ).bind(postId).first<{ totalVotes: number; avgScore: number | null }>();

        const totalVotes = result?.totalVotes || 0;
        const avgScore = result?.avgScore ? Number(result.avgScore.toFixed(1)) : null;

        return new Response(JSON.stringify({ totalVotes, avgScore }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const body: any = await context.request.json();
        const { postId = 'why-mpesa-is-slow', score, voterToken } = body;

        const numScore = parseInt(score, 10);
        if (isNaN(numScore) || numScore < 1 || numScore > 10) {
            return new Response(JSON.stringify({ error: 'Score must be between 1 and 10' }), { status: 400 });
        }

        // Check if this voter already voted on this post to update rather than double-count
        if (voterToken) {
            const existing = await context.env.DB.prepare(
                `SELECT id FROM post_ratings WHERE post_id = ? AND voter_token = ?`
            ).bind(postId, voterToken).first<{ id: number }>();

            if (existing) {
                await context.env.DB.prepare(
                    `UPDATE post_ratings SET score = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?`
                ).bind(numScore, existing.id).run();
            } else {
                await context.env.DB.prepare(
                    `INSERT INTO post_ratings (post_id, score, voter_token) VALUES (?, ?, ?)`
                ).bind(postId, numScore, voterToken).run();
            }
        } else {
            await context.env.DB.prepare(
                `INSERT INTO post_ratings (post_id, score, voter_token) VALUES (?, ?, ?)`
            ).bind(postId, numScore, null).run();
        }

        // Return updated stats
        const stats = await context.env.DB.prepare(
            `SELECT COUNT(*) as totalVotes, AVG(score) as avgScore FROM post_ratings WHERE post_id = ?`
        ).bind(postId).first<{ totalVotes: number; avgScore: number | null }>();

        return new Response(JSON.stringify({
            success: true,
            totalVotes: stats?.totalVotes || 0,
            avgScore: stats?.avgScore ? Number(stats.avgScore.toFixed(1)) : null
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
