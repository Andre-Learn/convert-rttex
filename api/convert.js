const formidable = require("formidable");
const fs = require("fs/promises");
const zlib = require("zlib");
const sharp = require("sharp");

const MAX_FILE_BYTES = 20 * 1024 * 1024;

function parseForm(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_FILE_BYTES,
    allowEmptyFiles: false,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

async function decodeRttx(filePath) {
  let data = await fs.readFile(filePath);

  if (data.subarray(0, 6).toString() === "RTPACK") {
    data = zlib.inflateSync(data.subarray(32));
  }

  if (data.subarray(0, 6).toString() !== "RTTXTR") {
    throw new Error("Format RTTEX tidak valid");
  }

  const width = data.readUInt32LE(12);
  const height = data.readUInt32LE(8);
  const channels = 3 + data[0x1c];

  if (!width || !height || ![3, 4].includes(channels)) {
    throw new Error("Ukuran atau channel RTTEX tidak valid");
  }

  const raw = data.subarray(0x7c);
  const expected = width * height * channels;

  if (raw.length < expected) {
    throw new Error("Data pixel RTTEX tidak lengkap");
  }

  return sharp(raw.subarray(0, expected), {
    raw: { width, height, channels }
  })
    .flip()
    .png()
    .toBuffer();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let parsed;

  try {
    parsed = await parseForm(req);
    const uploaded = first(parsed.files?.file);

    if (!uploaded) {
      return res.status(400).json({ error: "File RTTEX tidak ditemukan" });
    }

    const png = await decodeRttx(uploaded.filepath);

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${(uploaded.originalFilename || "converted").replace(/\.rttex$/i, "")}.png"`
    );

    return res.status(200).send(png);
  } catch (error) {
    console.error("RTTEX conversion failed:", error);
    return res.status(400).json({
      error: error?.message || "Gagal mengonversi RTTEX"
    });
  } finally {
    try {
      const uploaded = parsed && first(parsed.files?.file);
      if (uploaded?.filepath) await fs.unlink(uploaded.filepath).catch(() => {});
    } catch {}
  }
};
