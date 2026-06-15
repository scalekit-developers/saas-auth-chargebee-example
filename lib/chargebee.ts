import Chargebee from 'chargebee';

let chargebeeClient: Chargebee | null = null;

export function getChargebeeClient(): Chargebee {
  if (!chargebeeClient) {
    const site = process.env.CHARGEBEE_SITE;
    const apiKey = process.env.CHARGEBEE_API_KEY;

    if (!site || !apiKey) {
      throw new Error(
        'Missing Chargebee configuration. Set CHARGEBEE_SITE and CHARGEBEE_API_KEY.'
      );
    }

    chargebeeClient = new Chargebee({ site, apiKey });
  }

  return chargebeeClient;
}