export function responseFixture({
  requestedUrl = "https://example.test/source/",
  finalUrl = "https://example.test/destination/",
  initialStatus = 301,
  finalStatus = 200,
  observed = true,
  headers = { "content-type": "text/html; charset=UTF-8" },
  body = "<!doctype html><title>Fixture</title>",
} = {}) {
  return {
    requestedUrl,
    finalUrl,
    status: finalStatus,
    observed,
    headers,
    body,
    chain: [
      { url: requestedUrl, status: initialStatus, location: finalUrl },
      { url: finalUrl, status: finalStatus, location: null },
    ],
  };
}
