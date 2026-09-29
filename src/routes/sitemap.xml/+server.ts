import { env } from '$env/dynamic/public';
import { seoSettings, sitemapDocument } from '$lib/config/metadata';

export function GET() {
	return new Response(sitemapDocument(seoSettings(env)), {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
}
