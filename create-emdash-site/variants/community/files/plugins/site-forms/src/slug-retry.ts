// ctx.content.create derives the slug from `title` and offers no slug
// option. Two submissions with the same name arriving together race on that
// slug and the loser throws SLUG_CONFLICT; a retry gets the next free slug.
export async function retryOnSlugConflict<T>(create: () => Promise<T>, attempts = 3): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await create();
		} catch (err) {
			const code = (err as { code?: unknown } | null)?.code;
			if (code !== "SLUG_CONFLICT" || attempt >= attempts) {
				throw err;
			}
		}
	}
}
