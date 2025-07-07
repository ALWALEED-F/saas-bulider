const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// استخرج السب-دومين من الـ Host header
app.use((req, res, next) => {
  const host = req.headers.host.split(":")[0];
  const parts = host.split(".");
  req.subdomain = parts.length > 2 ? parts[0] : null;
  next();
});

// 🖋️ الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🖋️ إنشاء موقع جديد
app.post("/create", async (req, res) => {
  const { subdomain, title, bio, linkLabel, linkUrl } = req.body;

  const { error } = await supabase.from("sites").insert([
    {
      subdomain,
      title,
      bio,
      links: JSON.stringify([{ label: linkLabel, url: linkUrl }]),
    },
  ]);

  if (error) {
    console.error(error);
    return res.status(400).send(`❌ خطأ: ${error.message}`);
  }

  res.send(`
    <h1>✅ تم إنشاء موقعك!</h1>
    <p>رابط موقعك: <a href="http://${subdomain}.yourdomain.com">اضغط هنا</a></p>
  `);
});

// 🖋️ عرض موقع اليوزر
// 🖋️ عرض موقع اليوزر
app.get(/^\/.*/, async (req, res) => {
  if (!req.subdomain) {
    return res.redirect("/");
  }

  const { data: site, error } = await supabase
    .from("sites")
    .select("*")
    .eq("subdomain", req.subdomain)
    .single();

  if (!site || error) {
    return res.status(404).send("<h1>❌ الموقع غير موجود</h1>");
  }

  const html = `
      <h1>${site.title}</h1>
      <p>${site.bio}</p>
      <ul>
        ${JSON.parse(site.links)
          .map((link) => `<li><a href="${link.url}">${link.label}</a></li>`)
          .join("")}
      </ul>
    `;

  res.send(html);
});

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);
