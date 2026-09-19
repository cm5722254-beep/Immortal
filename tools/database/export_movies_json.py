#!/usr/bin/env python3
"""
Export complete movies data from Supabase Cloud PostgreSQL into movies.json
with local poster mappings and current database states.
"""
import asyncio
import json
import os
import sys
import asyncpg

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DATABASE_URL = "postgresql://postgres.tcrocbddnnfvwdpbokcb:NamiAnime2026%40Pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
ROOT_DIR = r"d:\Huang-anime"

async def export_json():
    print("🔌 Connecting to Supabase Cloud PostgreSQL...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    rows = await conn.fetch("""
        SELECT a.id, a.title, a.alt_title, a.slug, a.year, a.status, a.type, 
               a.poster_url, a.banner_url, a.description, a.studio, a.country,
               a.heat_score, a.view_count, a.average_rating, a.rating_count,
               COUNT(e.id) as episode_count
        FROM anime a
        LEFT JOIN episodes e ON e.anime_id = a.id
        GROUP BY a.id
        ORDER BY a.id
    """)
    await conn.close()
    
    movies_list = []
    for r in rows:
        title = r["title"]
        slug = r["slug"]
        poster_url = r["poster_url"] or ""
        
        # Local poster filename if present
        poster_local = f"{title}.jpg"
        
        movies_list.append({
            "id": r["id"],
            "title": title,
            "alt_title": r["alt_title"] or "",
            "slug": slug,
            "year": r["year"],
            "status": str(r["status"]),
            "type": str(r["type"]),
            "poster_url": poster_url,
            "poster_local": poster_local,
            "banner_url": r["banner_url"] or "",
            "description": r["description"] or "",
            "studio": r["studio"] or "",
            "country": r["country"] or "China",
            "heat_score": r["heat_score"] or 0,
            "view_count": r["view_count"] or 0,
            "average_rating": float(r["average_rating"] or 9.8),
            "rating_count": r["rating_count"] or 0,
            "episode_count": r["episode_count"]
        })
    
    output = {
        "generated_at": "2026-09-20",
        "total_movies": len(movies_list),
        "summary": {
            "valid_posters": sum(1 for m in movies_list if m["poster_url"]),
            "total_episodes": sum(m["episode_count"] for m in movies_list)
        },
        "categories": ["ONGOING", "COMPLETED", "UPCOMING"],
        "movies": movies_list
    }
    
    # Write to root movies.json
    movies_json_path = os.path.join(ROOT_DIR, "movies.json")
    with open(movies_json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"✅ Generated {movies_json_path} with {len(movies_list)} movies!")

    # Also write user's 50 movies subset json
    user_50_ids = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 67, 68]
    movies_50 = [m for m in movies_list if m["id"] in user_50_ids]
    output_50 = {
        "generated_at": "2026-09-20",
        "total_movies": len(movies_50),
        "categories": ["ONGOING", "COMPLETED", "UPCOMING"],
        "movies": movies_50
    }
    movies_50_path = os.path.join(ROOT_DIR, "movies_50_khmer.json")
    with open(movies_50_path, "w", encoding="utf-8") as f:
        json.dump(output_50, f, ensure_ascii=False, indent=2)
    print(f"✅ Generated {movies_50_path} with {len(movies_50)} movies!")

if __name__ == "__main__":
    asyncio.run(export_json())
