const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🔄 Đang mở video YouTube...\n");
  await page.goto("https://www.youtube.com/watch?v=mOqhhDXUgUo", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Chờ video load
  await page.waitForTimeout(3000);

  // Lấy thông tin video
  const title = await page
    .locator("h1.ytd-watch-metadata yt-formatted-string")
    .first()
    .textContent()
    .catch(() => "Không lấy được");

  const channel = await page
    .locator("ytd-channel-name yt-formatted-string a")
    .first()
    .textContent()
    .catch(() => "Không lấy được");

  const views = await page
    .locator("ytd-watch-info-text span")
    .first()
    .textContent()
    .catch(() => "Không lấy được");

  const description = await page
    .locator("ytd-text-inline-expander .ytd-text-inline-expander")
    .first()
    .textContent()
    .catch(() => "Không lấy được");

  console.log("=".repeat(60));
  console.log("📹 THÔNG TIN VIDEO");
  console.log("=".repeat(60));
  console.log(`Tiêu đề: ${title?.trim()}`);
  console.log(`Kênh: ${channel?.trim()}`);
  console.log(`Lượt xem: ${views?.trim()}`);
  console.log(`\nMô tả:\n${description?.trim().substring(0, 500)}`);

  // Scroll xuống comments
  console.log("\n🔄 Đang scroll để load bình luận...\n");
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1500);
  }

  // Lấy bình luận
  const comments = await page.evaluate(() => {
    const items = document.querySelectorAll("ytd-comment-thread-renderer");
    const results = [];
    items.forEach((item, i) => {
      if (i >= 15) return;
      const author =
        item.querySelector("#author-text span")?.textContent?.trim() || "";
      const text =
        item.querySelector("#content-text")?.textContent?.trim() || "";
      const likes =
        item.querySelector("#vote-count-middle")?.textContent?.trim() || "0";
      if (text) results.push({ author, text, likes });
    });
    return results;
  });

  console.log("=".repeat(60));
  console.log(`💬 BÌNH LUẬN (${comments.length} bình luận)`);
  console.log("=".repeat(60));

  comments.forEach((c, i) => {
    console.log(`\n--- Bình luận #${i + 1} ---`);
    console.log(`👤 ${c.author}`);
    console.log(`👍 ${c.likes} likes`);
    console.log(`💬 ${c.text.substring(0, 300)}`);
  });

  if (comments.length === 0) {
    console.log("⚠️ Không lấy được bình luận (có thể bị tắt hoặc cần scroll thêm)");
  }

  await browser.close();
  console.log("\n✅ Hoàn tất!");
})();
