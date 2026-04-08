// =============================================
// Chart Whisperer — Content Script
// =============================================

(function () {
  "use strict";

  let selectorActive = false;
  let selectionOverlay = null;
  let selectionBox = null;
  let startX = 0;
  let startY = 0;

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "show-notification") {
      showNotification(message.message);
    }
  });

  // Listen for area selector activation
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "CW_ACTIVATE_SELECTOR") {
      activateSelector();
    }
  });

  // ---- Notification Toast ----
  function showNotification(text) {
    const existing = document.getElementById("cw-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "cw-notification";
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #e0e0e0;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        max-width: 350px;
        animation: cwSlideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <span style="font-size: 20px;">🔍</span>
        <span>${text}</span>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes cwSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes cwSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(toast);

    setTimeout(() => {
      const inner = toast.querySelector("div");
      if (inner) inner.style.animation = "cwSlideOut 0.3s ease-in forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ---- Area Selector ----
  function activateSelector() {
    if (selectorActive) return;
    selectorActive = true;

    showNotification("Click and drag to select the chart area");

    // Create full-screen overlay
    selectionOverlay = document.createElement("div");
    selectionOverlay.id = "cw-selector-overlay";
    selectionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483646;
      cursor: crosshair;
      background: rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(1px);
    `;

    // Instruction banner
    const banner = document.createElement("div");
    banner.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 24px;
      border-radius: 24px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 2147483647;
      pointer-events: none;
    `;
    banner.textContent = "📐 Drag to select the chart area • Press ESC to cancel";
    selectionOverlay.appendChild(banner);

    // Selection box
    selectionBox = document.createElement("div");
    selectionBox.style.cssText = `
      position: fixed;
      border: 2px dashed #667eea;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 4px;
      display: none;
      z-index: 2147483647;
      pointer-events: none;
    `;
    selectionOverlay.appendChild(selectionBox);

    document.body.appendChild(selectionOverlay);

    selectionOverlay.addEventListener("mousedown", onSelectorMouseDown);
    document.addEventListener("keydown", onSelectorKeyDown);
  }

  function onSelectorMouseDown(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;

    selectionBox.style.left = startX + "px";
    selectionBox.style.top = startY + "px";
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    selectionBox.style.display = "block";

    document.addEventListener("mousemove", onSelectorMouseMove);
    document.addEventListener("mouseup", onSelectorMouseUp);
  }

  function onSelectorMouseMove(e) {
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBox.style.left = left + "px";
    selectionBox.style.top = top + "px";
    selectionBox.style.width = width + "px";
    selectionBox.style.height = height + "px";
  }

  function onSelectorMouseUp(e) {
    document.removeEventListener("mousemove", onSelectorMouseMove);
    document.removeEventListener("mouseup", onSelectorMouseUp);

    const endX = e.clientX;
    const endY = e.clientY;

    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    deactivateSelector();

    // Minimum selection size check
    if (width < 20 || height < 20) {
      showNotification("Selection too small. Please try again with a larger area.");
      return;
    }

    captureArea(left, top, width, height);
  }

  function onSelectorKeyDown(e) {
    if (e.key === "Escape") {
      deactivateSelector();
      showNotification("Selection cancelled.");
    }
  }

  function deactivateSelector() {
    selectorActive = false;
    document.removeEventListener("keydown", onSelectorKeyDown);
    if (selectionOverlay) {
      selectionOverlay.remove();
      selectionOverlay = null;
    }
  }

  // Capture the selected area using canvas
  async function captureArea(left, top, width, height) {
    showNotification("Capturing chart area...");

    try {
      // Use html2canvas-style approach via offscreen capture
      // We request the background to capture the visible tab
      const response = await chrome.runtime.sendMessage({
        action: "capture-visible-tab"
      });

      // Fallback: create canvas from the page
      // For simplicity, we use a canvas-based crop approach
      const canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d");

      // Capture using the experimental API or fallback
      // Here we use a simple approach with drawWindow alternative
      const img = new Image();
      img.crossOrigin = "anonymous";

      // Request screenshot from background
      chrome.runtime.sendMessage({
        action: "capture-tab-screenshot",
        data: { left, top, width, height, dpr }
      });

    } catch (error) {
      // Fallback: try to find and capture the image element in the selection area
      const elements = document.elementsFromPoint(left + width / 2, top + height / 2);
      let chartImage = null;

      for (const el of elements) {
        if (el.tagName === "IMG" || el.tagName === "CANVAS" || el.tagName === "SVG") {
          chartImage = el;
          break;
        }
      }

      if (chartImage) {
        captureElement(chartImage);
      } else {
        showNotification("Could not capture area. Try right-clicking the chart image directly.");
      }
    }
  }

  // Capture a specific element
  function captureElement(element) {
    try {
      let base64Data;

      if (element.tagName === "CANVAS") {
        base64Data = element.toDataURL("image/png");
      } else if (element.tagName === "IMG") {
        const canvas = document.createElement("canvas");
        canvas.width = element.naturalWidth || element.width;
        canvas.height = element.naturalHeight || element.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(element, 0, 0);
        base64Data = canvas.toDataURL("image/png");
      } else if (element.tagName === "SVG") {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(element);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = element.getBoundingClientRect().width * 2;
          canvas.height = element.getBoundingClientRect().height * 2;
          const ctx = canvas.getContext("2d");
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);
          const data = canvas.toDataURL("image/png");
          URL.revokeObjectURL(url);
          sendCapturedImage(data);
        };
        img.src = url;
        return;
      }

      if (base64Data) {
        sendCapturedImage(base64Data);
      }
    } catch (error) {
      showNotification("Could not capture this element due to security restrictions.");
    }
  }

  function sendCapturedImage(base64Data) {
    chrome.runtime.sendMessage({
      action: "area-captured",
      data: {
        imageBase64: base64Data,
        sourceUrl: window.location.href,
        sourceTitle: document.title
      }
    });
    showNotification("Chart captured! Analyzing...");
  }

})();