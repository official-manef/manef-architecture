import { env } from '$env/dynamic/public';
import { robotsDocument, seoSettings } from '$lib/config/metadata';

export function GET() {
	return new Response(robotsDocument(seoSettings(env)), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
}
