/**
 * Helper function to fetch all pages of a GitLab API endpoint
 * @param url - The API endpoint URL
 * @param token - The personal access token
 * @returns An array of all items from all pages
 */
export async function fetchAllPages(url: string, token: string): Promise<any[]> {
    let page = 1;
    let hasMorePages = true;
    const allItems: any[] = [];
    const perPage = 100;

    while (hasMorePages) {
        const pageUrl = `${url}${url.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`;
        console.log(`Fetching page ${page} from ${pageUrl}`);

        const response = await fetch(pageUrl, {
            headers: {
                'PRIVATE-TOKEN': token
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
        }

        const items = await response.json();
        allItems.push(...items);

        // Check if there are more pages
        const totalPages = response.headers.get('x-total-pages');
        if (totalPages) {
            hasMorePages = page < parseInt(totalPages);
        } else {
            // If the header is not available, check if we got a full page of results
            hasMorePages = items.length === perPage;
        }

        page++;
    }

    return allItems;
}