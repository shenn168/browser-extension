// =============================================
// Chart Whisperer — API Utilities
// =============================================

/**
 * Validates that an image string is a proper base64 data URL.
 * @param {string} str - The string to validate.
 * @returns {boolean} True if valid base64 image data URL.
 */
function isValidBase64Image(str) {
  if (!str || typeof str !== "string") {
    return false;
  }
  return str.startsWith("data:image/");
}

/**
 * Compresses a base64 image to reduce API payload size.
 * Returns a promise that resolves to a compressed base64 string.
 * @param {string} base64Str - The base64 data URL of the image.
 * @param {number} [maxWidth=1600] - Maximum width in pixels.
 * @param {number} [quality=0.85] - JPEG compression quality (0 to 1).
 * @returns {Promise<string>} Compressed base64 data URL.
 */
function compressImage(base64Str, maxWidth, quality) {
  // Default parameter values handled explicitly for broad compatibility
  if (typeof maxWidth === "undefined" || maxWidth === null) {
    maxWidth = 1600;
  }
  if (typeof quality === "undefined" || quality === null) {
    quality = 0.85;
  }

  return new Promise(function (resolve, reject) {
    // Guard: ensure we are in a DOM context
    if (typeof document === "undefined") {
      reject(new Error("compressImage requires a DOM context and cannot run in a service worker."));
      return;
    }

    if (!isValidBase64Image(base64Str)) {
      reject(new Error("Invalid base64 image string provided."));
      return;
    }

    var img = new Image();

    img.onload = function () {
      var width = img.width;
      var height = img.height;

      // Scale down if too large
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      var compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };

    img.onerror = function () {
      reject(new Error("Failed to load image for compression."));
    };

    img.src = base64Str;
  });
}

/**
 * Estimates the token cost of an image based on dimensions.
 * (Rough approximation for OpenAI vision pricing.)
 * @param {number} width - Image width in pixels.
 * @param {number} height - Image height in pixels.
 * @returns {number} Estimated token count.
 */
function estimateImageTokens(width, height) {
  if (!width || !height || width <= 0 || height <= 0) {
    return 0;
  }

  // OpenAI high-detail mode: image is split into 512x512 tiles
  var tilesX = Math.ceil(width / 512);
  var tilesY = Math.ceil(height / 512);
  var totalTiles = tilesX * tilesY;

  // Each tile costs approximately 170 tokens, plus 85 base tokens
  return 85 + (totalTiles * 170);
}

/**
 * Formats a raw analysis string for display.
 * Trims whitespace and ensures consistent formatting.
 * @param {string} text - Raw analysis text from the API.
 * @returns {string} Cleaned and formatted text.
 */
function formatAnalysisText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .trim()
    .replace(/\
{3,}/g, "\
\
")
    .replace(/[ \t]+$/gm, "");
}