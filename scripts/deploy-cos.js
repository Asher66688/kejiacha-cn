"use strict";

const fs = require("fs");
const path = require("path");
const COS = require("cos-nodejs-sdk-v5");

const REQUIRED_ENV = [
  "COS_SECRET_ID",
  "COS_SECRET_KEY",
  "COS_BUCKET",
  "COS_REGION",
];

for (const envName of REQUIRED_ENV) {
  if (!process.env[envName]) {
    console.error(`[ERROR] Missing environment variable: ${envName}`);
    process.exit(1);
  }
}

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEPLOY_ENTRIES = ["index.html", "assets"];

const CONTENT_TYPE_MAP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function toPosixPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function collectFiles(absPath, files) {
  const stat = fs.statSync(absPath);
  if (stat.isDirectory()) {
    const children = fs.readdirSync(absPath);
    for (const child of children) {
      collectFiles(path.join(absPath, child), files);
    }
    return;
  }

  if (stat.isFile()) {
    const relPath = toPosixPath(path.relative(PROJECT_ROOT, absPath));
    files.push(relPath);
  }
}

function discoverDeployFiles() {
  const files = [];

  for (const entry of DEPLOY_ENTRIES) {
    const absPath = path.join(PROJECT_ROOT, entry);
    if (!fs.existsSync(absPath)) {
      console.error(`[ERROR] Required path not found: ${entry}`);
      process.exit(1);
    }
    collectFiles(absPath, files);
  }

  return files.sort();
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || "application/octet-stream";
}

function getCacheControl(filePath) {
  if (filePath === "index.html") {
    return "no-cache";
  }
  if (filePath.startsWith("assets/")) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=3600";
}

function uploadFile(cos, filePath) {
  const absPath = path.join(PROJECT_ROOT, filePath);

  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: process.env.COS_BUCKET,
        Region: process.env.COS_REGION,
        Key: filePath,
        Body: fs.createReadStream(absPath),
        ContentType: getContentType(filePath),
        CacheControl: getCacheControl(filePath),
      },
      (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        if (data && data.statusCode >= 200 && data.statusCode < 300) {
          resolve();
          return;
        }

        reject(new Error(`Upload failed: ${filePath}`));
      }
    );
  });
}

async function main() {
  const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
  });

  const files = discoverDeployFiles();
  console.log(`[INFO] Uploading ${files.length} files to COS bucket ${process.env.COS_BUCKET}`);

  for (const filePath of files) {
    // Upload sequentially for clearer logs and simpler failure recovery.
    await uploadFile(cos, filePath);
    console.log(`[OK] ${filePath}`);
  }

  console.log("[DONE] COS deployment completed.");
}

main().catch((err) => {
  console.error("[ERROR] Deployment failed.");
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
