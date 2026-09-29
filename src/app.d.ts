// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			message: string;
			id?: string;
		}
		interface Locals {
			requestId: string;
		}
		interface PageData {
			meta?: { title?: string; description?: string; indexable?: boolean };
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
