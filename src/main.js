
const { URL } = require('url');
const Apify = require('apify');


// Here we use debug level of logging to improve the debugging experience.
const { log } = Apify.utils;
log.setLevel(log.LEVELS.DEBUG);


Apify.main(async () => {
    // Create an instance of the RequestList class that contains a list of URLs to crawl.
    // Add URLs to a RequestList
    const requestList = await Apify.openRequestList('my-list', [
        { url: 'https://www.fastenal.com/products/details/0833360' },
        { url: 'https://www.fastenal.com/products/details/99329957' },
        { url: 'https://www.fastenal.com/products/details/0878242' },
    ]);
    // CheerioCrawler automatically loads the URLs and parses their HTML using the cheerio library.
    const crawler = new Apify.CheerioCrawler({
        // Let the crawler fetch URLs from our list.
        requestList,

        // Concurency Limits.
        minConcurrency: 10,
        maxConcurrency: 50,

        // On error, retry each page at most once.
        maxRequestRetries: 1,

        // Increase the timeout for processing of each page.
        handlePageTimeoutSecs: 30,

        // Limit to 10 requests per one crawl
        maxRequestsPerCrawl: 10,

        handlePageFunction: async ({ request, $ }) => {
            log.debug(`Processing ${request.url}...`);

            // Extract data from the page using cheerio.
            const productName = $('.info--description').text();
            let price = $('.whole__sale--label').text().replace(/\s+/g, " ").trim();
            let availability = $('.label-availability').text().replace(/\s+/g, " ").trim();

            // This function is not necessary but I wanted the data to be saved as we discussed on Slack :D
            function toStock(availability) {
                if (availability === 'Available Inventory') {
                    return 'In Stock';
                } else if (availability === 'Contact Branch') {
                    return 'See Site';
                } else {
                    return 'Out Of Stock';
                }
            }

            let stock = toStock(availability);

            // Saving data to local storage: apify_storage\datasets\default
            await Apify.pushData({
                url: request.url, // I will leave the URl to get saved in JSON just in case.
                productName,
                price,
                stock,
            });
        },

        handleFailedRequestFunction: async ({ request }) => {
            log.debug(`Request ${request.url} failed twice.`);
        },
    });

    await crawler.run();

    log.debug('Crawler finished.');
});