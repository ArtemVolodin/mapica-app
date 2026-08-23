const fs = require('fs');
const path = require('path');

let cachedHtml = null;

function loadHtml() {
  if (cachedHtml) return cachedHtml;
  const filePath = path.join(process.cwd(), 'public', 'local', 'index.html');
  cachedHtml = fs.readFileSync(filePath, 'utf8');
  return cachedHtml;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end();
    return;
  }

  try {
    const html = loadHtml();
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.send(html);
  } catch (error) {
    console.error('local landing page error', error);
    res.status(500).send('Local landing page unavailable');
  }
};
