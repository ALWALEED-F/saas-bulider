const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const PORT = process.env.PORT || 3000;

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// إنشاء موقع جديد
app.post("/create", async (req, res) => {
  const { username, title, bio, linkLabel, linkUrl, template } = req.body;

  const { error } = await supabase.from("sites").insert([
    {
      username,
      title,
      bio,
      template, // القالب اللي اختاره
      links: JSON.stringify([{ label: linkLabel, url: linkUrl }]),
    },
  ]);

  if (error) {
    console.error(error);
    return res.status(400).send(`❌ خطأ: ${error.message}`);
  }

  res.send(`
    <h1>✅ تم إنشاء موقعك!</h1>
    <p>رابط موقعك: <a href="/user/${username}">اضغط هنا</a></p>
  `);
});

// عرض موقع اليوزر
app.get("/user/:username", async (req, res) => {
  const { username } = req.params;

  const { data: site, error } = await supabase
    .from("sites")
    .select("*")
    .eq("username", username)
    .single();

  if (!site || error) {
    return res.status(404).send("<h1>❌ الموقع غير موجود</h1>");
  }

  // حدد القالب
  const templatePath = `templates/${site.template}.html`;

  if (!fs.existsSync(templatePath)) {
    return res.status(404).send("<h1>❌ القالب غير موجود</h1>");
  }

  const template = fs.readFileSync(templatePath, "utf-8");

  const linksHTML = JSON.parse(site.links)
    .map(
      (link) => `
      <a href="${link.url}" target="_blank" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        ${link.label}
      </a>
    `
    )
    .join("");

  const html = template
    .replace(/{{title}}/g, site.title)
    .replace(/{{bio}}/g, site.bio)
    .replace(/{{links}}/g, linksHTML);

  res.send(html);
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
