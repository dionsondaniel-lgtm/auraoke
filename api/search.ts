import yts from "yt-search";

export default async function handler(req: any, res: any) {
  // 1. Check if it's a GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    // 2. Format query
    const searchQuery = query.toLowerCase().includes("karaoke") ? query : `${query} karaoke`;
    const r = await yts(searchQuery);
    
    // 3. Get candidates
    const candidates = r.videos.slice(0, 15);
    const embeddableVideos = [];
    
    // 4. Check which ones allow embedding
    for (const v of candidates) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (oembedRes.ok) {
          embeddableVideos.push(v);
          if (embeddableVideos.length === 5) break;
        }
      } catch (e) {
        // Ignore fetch errors
      }
    }
    
    // 5. Fallback if YouTube blocks Vercel's IP
    if (embeddableVideos.length === 0 && candidates.length > 0) {
      embeddableVideos.push(...candidates.slice(0, 5));
    }
    
    // 6. Send successful response
    return res.status(200).json({
      results: embeddableVideos.map(v => ({
        id: v.videoId,
        title: v.title,
        artist: v.author.name,
        videoId: v.videoId,
        thumbnail: v.thumbnail
      }))
    });

  } catch (error) {
    console.error("Vercel Search Error:", error);
    return res.status(500).json({ error: "Failed to search videos" });
  }
}