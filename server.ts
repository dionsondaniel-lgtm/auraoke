import express from "express";
import { createServer as createViteServer } from "vite";
// @ts-ignore - ignores TS warning if @types/yt-search is not installed
import yts from "yt-search";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route for YouTube search
  app.get("/api/search", async (req, res) => {
    try {
      // 1. Force TypeScript to recognize the query as a string
      const query = typeof req.query.q === 'string' ? req.query.q : '';
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }
      
      const isKaraokeQuery = query.toLowerCase().includes("karaoke") || query.toLowerCase().includes("instrumental");
      const searchQuery = isKaraokeQuery ? query : `${query} karaoke`;
      const r = await yts(searchQuery);
      
      const candidates = r.videos.slice(0, 15);
      const embeddableVideos = [];
      
      // 2. Explicitly cast to any[] to fix the "v implicitly has an 'any' type" error
      for (const v of candidates as any[]) {
        try {
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.videoId}&format=json`);
          if (oembedRes.ok) {
            embeddableVideos.push({
              id: v.videoId,
              title: v.title,
              artist: v.author.name,
              videoId: v.videoId,
              thumbnail: v.thumbnail
            });
            if (embeddableVideos.length === 5) break;
          }
        } catch (e) {
          // ignore
        }
      }

      // 3. Explicitly type v as any in the map function
      const results = embeddableVideos.length > 0 ? embeddableVideos : candidates.slice(0, 8).map((v: any) => ({
        id: v.videoId,
        title: v.title,
        artist: v.author.name,
        videoId: v.videoId,
        thumbnail: v.thumbnail
      }));
      
      res.json({ results });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to search videos" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();