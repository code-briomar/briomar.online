interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const url = new URL(context.request.url);
        const postId = url.searchParams.get('postId') || 'why-mpesa-is-slow';

        const { results } = await context.env.DB.prepare(
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
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message, comments: [] }), { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const body: any = await context.request.json();
        const { postId = 'why-mpesa-is-slow', name, handle, score, body: commentBody } = body;

        const trimmedName = (name || '').trim().slice(0, 50);
        const trimmedBody = (commentBody || '').trim().slice(0, 1000);
        const trimmedHandle = (handle || '').trim().slice(0, 50);
        const numScore = score ? parseInt(score, 10) : null;

        if (!trimmedName || !trimmedBody) {
            return new Response(JSON.stringify({ error: 'Name and comment are required' }), { status: 400 });
        }

        const insertResult = await context.env.DB.prepare(
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
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
