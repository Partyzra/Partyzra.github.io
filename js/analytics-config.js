/*
  Partyzra custom analytics configuration
  --------------------------------------
  The portfolio sends small anonymous analytics events to the Cloudflare Worker.
  No Cloudflare password, API token, or database credential belongs in this file.
*/
window.PORTFOLIO_ANALYTICS_CONFIG = {
  provider: 'partyzra-custom',
  endpoint: 'https://partyzra-analytics.12rparker.workers.dev/track',
  trackLocal: false
};
