const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const STATE_FILE = path.join(__dirname, "fb-auth-state.json");

(async () => {
  // Kiểm tra đã có session lưu sẵn chưa
  const hasState = fs.existsSync(STATE_FILE);

  let browser, page;

  if (hasState) {
    // === Dùng session đã lưu ===
    console.log("🔑 Đang dùng session đã lưu...\n");
    browser = await chromium.launch({ headless: false, slowMo: 200 });
    const context = await browser.newContext({
      storageState: STATE_FILE,
      viewport: { width: 1280, height: 900 },
    });
    page = await context.newPage();
  } else {
    // === Lần đầu: mở browser để user login thủ công ===
    console.log("🔐 Lần đầu chạy — cần đăng nhập thủ công.\n");
    console.log("👉 Browser sẽ mở ra, hãy đăng nhập Facebook.");
    console.log("👉 Sau khi login xong, quay lại terminal nhấn ENTER.\n");

    browser = await chromium.launch({ headless: false, slowMo: 200 });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    page = await context.newPage();
    await page.goto("https://www.facebook.com/login", { waitUntil: "networkidle" });

    // Chờ user login thủ công
    await page.waitForURL("**/facebook.com/?**", { timeout: 120000 }).catch(() => {});
    
    // Chờ thêm cho chắc
    await page.waitForTimeout(3000);

    // Lưu session
    await context.storageState({ path: STATE_FILE });
    console.log("💾 Đã lưu session vào fb-auth-state.json!\n");
  }

  // === Vào group OpenClaw VN ===
  console.log("🔄 Đang vào group OpenClaw Việt Nam...\n");
  await page.goto("https://www.facebook.com/groups/openclawvietnam/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  const url = page.url();
  if (url.includes("login") || url.includes("checkpoint")) {
    console.log("❌ Session hết hạn! Xóa fb-auth-state.json rồi chạy lại.");
    await browser.close();
    return;
  }

  console.log("✅ Đã vào group!\n");

  // === Scroll ===
  console.log("🔄 Scroll để load bài viết...\n");
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(2500);
    console.log(`  Scroll ${i + 1}/15...`);
  }

  // === Lấy bài viết ===
  const posts = await page.evaluate(() => {
    const feed = document.querySelector('[role="feed"]') ||
                 document.querySelector('[role="main"]');
    if (!feed) return [];

    const articles = feed.querySelectorAll('[role="article"]');
    const results = [];

    articles.forEach((article) => {
      if (results.length >= 20) return;

      const textNodes = article.querySelectorAll('[dir="auto"]');
      let content = "";
      textNodes.forEach((node) => {
        const t = node.innerText?.trim();
        if (t && t.length > 20 && !content.includes(t)) {
          content += t + "\n";
        }
      });

      // Lấy author
      const authorEl = article.querySelector('a[role="link"] strong, h3 a, h4 a');
      const author = authorEl?.innerText?.trim() || "";

      // Lấy thời gian
      const timeEl = article.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
      const time = timeEl?.innerText?.trim() || "";

      // Lấy reactions
      const reactionSpans = article.querySelectorAll('span[aria-hidden="true"]');
      let reactions = "";
      reactionSpans.forEach((s) => {
        const t = s.innerText?.trim();
        if (t && /^\d/.test(t) && !reactions) reactions = t;
      });

      if (content.length > 80) {
        results.push({
          author,
          time,
          content: content.substring(0, 1200),
          reactions,
        });
      }
    });

    return results;
  });

  // === Hiển thị ===
  console.log("\n" + "=".repeat(60));
  console.log(`📋 TÌM THẤY ${posts.length} BÀI VIẾT`);
  console.log("=".repeat(60));

  posts.forEach((p, i) => {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`📌 Bài #${i + 1}`);
    if (p.author) console.log(`👤 ${p.author}`);
    if (p.time) console.log(`🕐 ${p.time}`);
    if (p.reactions) console.log(`❤️  ${p.reactions} reactions`);
    console.log(`📝 ${p.content}`);
  });

  if (posts.length === 0) {
    console.log("⚠️ Không lấy được bài viết.");
    // Lưu raw content để debug
    const raw = await page.evaluate(() => {
      const main = document.querySelector('[role="main"]');
      return main?.innerText?.substring(0, 5000) || "";
    });
    fs.writeFileSync("fb-raw-content.txt", raw, "utf-8");
    console.log("💾 Đã lưu raw content vào fb-raw-content.txt");
  }

  await browser.close();
  console.log("\n✅ Hoàn tất!");
})();
