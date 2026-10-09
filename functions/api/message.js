// Cloudflare Pages Function: /api/message
// Edge API endpoint to receive visitor messages without exposing personal email

export async function onRequestPost(context) {
	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Content-Type': 'application/json',
	};

	try {
		const body = await context.request.json();
		const { name, email, subject, message, isPublic } = body;

		if (!name || !email || !message) {
			return new Response(
				JSON.stringify({ success: false, error: 'Name, email, and message are required.' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Recipient email from Cloudflare environment variable, with fallback
		const targetEmail =
			context.env?.CONTACT_EMAIL ||
			(() => {
				try {
					// Base64 decoded to prevent cleartext in repo scrapers
					return atob('a2Fwb2xvbmJyYWluZUBnbWFpbC5jb20=');
				} catch {
					return '';
				}
			})();

		if (!targetEmail) {
			return new Response(
				JSON.stringify({ success: false, error: 'Recipient address not configured.' }),
				{ status: 500, headers: corsHeaders }
			);
		}

		// Dispatch via FormSubmit AJAX endpoint from Cloudflare Edge
		const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`;
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({
				name: name.trim(),
				email: email.trim(),
				_replyto: email.trim(),
				_subject: `[briomar thread] ${subject?.trim() || 'New Discussion Message'}`,
				topic: subject?.trim() || 'General Inquiry',
				public_thread_consent: isPublic ? 'Yes (Can be published as thread)' : 'No (Keep private 1-on-1)',
				message: message.trim(),
			}),
		});

		const result = await response.json().catch(() => ({}));

		return new Response(
			JSON.stringify({
				success: true,
				dispatched: true,
				feedback: 'Message received and email notification dispatched.',
				details: result,
			}),
			{ status: 200, headers: corsHeaders }
		);
	} catch (err) {
		return new Response(
			JSON.stringify({
				success: false,
				error: err.message || 'Internal Edge error',
			}),
			{ status: 500, headers: corsHeaders }
		);
	}
}

export async function onRequestOptions() {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		},
	});
}
