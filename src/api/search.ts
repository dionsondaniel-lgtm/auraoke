import yts from "yt-search";

export default async function handler(req: any, res: any) {
  try {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "Query is required" });
    
    const searchQuery = query.toLowerCase().includes("karaoke") ? query : `${query} karaoke`;
    const r = await yts(searchQuery);
    
    const candidates = r.videos.slice(0, 15);
    const embeddableVideos = [];
    
    for (const v of candidates) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.videoId}`);
        if (oembedRes.ok) embeddableVideos.push(v);
        if (embeddableVideos.length === 5) break;
      } catch (e) {}
    }
    
    // Fallback if blocked
    if (embeddableVideos.length === 0 && candidates.length > 0) {
      embeddableVideos.push(...candidates.slice(0, 5));
    }
    
    res.json({
      results: embeddableVideos.map(v => ({
        id: v.videoId, title: v.title, artist: v.author.name, videoId: v.videoId, thumbnail: v.thumbnail
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to search videos" });
  }
}