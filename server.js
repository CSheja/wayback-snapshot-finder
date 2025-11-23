// server.js - Backend API Server (No Express - Pure Node.js)

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json'
};

// Function to fetch data from Wayback Machine CDX API
function fetchWaybackData(targetUrl, callback) {
  // Clean the URL - remove protocol if present
  let cleanUrl = targetUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Use CDX Server API - returns ALL snapshots
  const apiUrl = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cleanUrl)}&output=json&fl=timestamp,original,statuscode,mimetype&limit=1000`;
  
  console.log('Requesting:', apiUrl);
  
  const options = {
    headers: {
      'User-Agent': 'WaybackSnapshotFinder/1.0'
    }
  };
  
  // Use http instead of https for this endpoint
  http.get(apiUrl, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response length:', data.length, 'bytes');
      
      if (res.statusCode !== 200) {
        callback(new Error('API returned status ' + res.statusCode), null);
        return;
      }
      
      try {
        const result = JSON.parse(data);
        
        // Check if we have data (should be an array)
        if (!Array.isArray(result) || result.length < 2) {
          callback(new Error('No snapshots found for this URL'), null);
          return;
        }
        
        console.log(`✅ Found ${result.length - 1} snapshots (header + data)`);
        callback(null, result);
      } catch (error) {
        console.error('JSON Parse Error:', error.message);
        console.log('First 500 chars of response:', data.substring(0, 500));
        callback(new Error('Invalid API response'), null);
      }
    });
    
  }).on('error', (error) => {
    console.error('HTTP Request Error:', error.message);
    callback(error, null);
  });
}

// Function to serve static files from /public directory
function serveStaticFile(filePath, res) {
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - File Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 - Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // API endpoint: /api/snapshots?url=example.com
  if (pathname === '/api/snapshots' && req.method === 'GET') {
    const targetUrl = parsedUrl.query.url;
    
    // Validate URL parameter
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing URL parameter' }));
      return;
    }
    
    console.log(`\n--- Fetching snapshots for: ${targetUrl} ---`);
    
    // Fetch data from Wayback Machine
    fetchWaybackData(targetUrl, (error, data) => {
      if (error) {
        console.error('API Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      } else {
        console.log('✅ Success! Returning data');
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(data));
      }
    });
  }
  // Serve static files from /public directory
  else {
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, 'public', filePath);
    serveStaticFile(filePath, res);
  }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${PORT}/`);
  console.log(`📂 Serving files from: ${path.join(__dirname, 'public')}`);
  console.log(`🔌 API endpoint: http://localhost:3000/api/snapshots?url=example.com`);
  console.log(`\nTest with: curl "http://localhost:3000/api/snapshots?url=example.com"\n`);
});
