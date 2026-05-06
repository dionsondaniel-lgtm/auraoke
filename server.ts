import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import yts from "yt-search";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // API route for YouTube search
  app.get("/api/search", async (req: Request, res: Response): Promise<any> => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }
      
      // Ensure we're searching for a karaoke version
      const searchQuery = query.toLowerCase().includes("karaoke") ? query : `${query} karaoke`;
      const r = await yts(searchQuery);
      
      // Filter for videos that allow embedding
      const candidates = r.videos.slice(0, 15);
      const embeddableVideos = [];
      
      for (const v of candidates) {
        try {
          // Check oEmbed endpoint with a User-Agent to bypass some bot protections
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.videoId}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
          });
          if (oembedRes.ok) {
            embeddableVideos.push(v);
            if (embeddableVideos.length === 5) break;
          }
        } catch (e) {
          // Ignore network errors for single video check
        }
      }

      // 🚨 CRITICAL FALLBACK: If deployed server was blocked by YouTube, fallback to raw candidates
      if (embeddableVideos.length === 0 && candidates.length > 0) {
        embeddableVideos.push(...candidates.slice(0, 5));
      }
      
      const results = embeddableVideos.map(v => ({
        id: v.videoId,
        title: v.title,
        artist: v.author.name,
        videoId: v.videoId,
        thumbnail: v.thumbnail
      }));
      
      return res.json({ results });
    } catch (error) {
      console.error("Search error:", error);
      return res.status(500).json({ error: "Failed to search videos" });
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
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();