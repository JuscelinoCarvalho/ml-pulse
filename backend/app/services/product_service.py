"""
Serviço de Pesquisa e Análise de Produtos.
Aplica lógica de negócio sobre os dados brutos da API ML.
"""
from typing import Any

from app.services.ml_client import MLClient


async def search_and_analyze(
    client: MLClient,
    query: str,
    category: str | None = None,
    limit: int = 50,
) -> dict:
    """
    Busca produtos e retorna análise enriquecida:
    - Preço mínimo, máximo e médio
    - Top vendedores
    - Score de oportunidade por item
    - Palavras-chave mais comuns nos títulos líderes
    """
    raw = await client.search_products(query, category=category, limit=limit)
    results = raw.get("results", [])

    if not results:
        return {"query": query, "total": 0, "items": [], "summary": {}}

    prices = [r["price"] for r in results if r.get("price")]
    sellers: dict[str, dict] = {}

    enriched = []
    for item in results:
        seller = item.get("seller", {})
        seller_id = str(seller.get("id", ""))

        if seller_id and seller_id not in sellers:
            sellers[seller_id] = {
                "id": seller_id,
                "nickname": seller.get("nickname", ""),
                "items": 0,
                "total_sold": 0,
            }
        if seller_id:
            sellers[seller_id]["items"] += 1
            sellers[seller_id]["total_sold"] += item.get("sold_quantity", 0)

        enriched.append({
            "id": item.get("id"),
            "title": item.get("title"),
            "price": item.get("price"),
            "currency": item.get("currency_id"),
            "sold_quantity": item.get("sold_quantity", 0),
            "condition": item.get("condition"),
            "thumbnail": item.get("thumbnail"),
            "permalink": item.get("permalink"),
            "seller_id": seller_id,
            "seller_nickname": seller.get("nickname", ""),
            "shipping_free": item.get("shipping", {}).get("free_shipping", False),
            "opportunity_score": _opportunity_score(item),
        })

    # Ordena por opportunity_score
    enriched.sort(key=lambda x: x["opportunity_score"], reverse=True)

    summary = {
        "total_found": raw.get("paging", {}).get("total", 0),
        "returned": len(results),
        "price_min": min(prices) if prices else 0,
        "price_max": max(prices) if prices else 0,
        "price_avg": round(sum(prices) / len(prices), 2) if prices else 0,
        "top_sellers": sorted(sellers.values(), key=lambda s: s["total_sold"], reverse=True)[:5],
        "keyword_cloud": _keyword_cloud([r["title"] for r in results[:20]]),
    }

    return {"query": query, "items": enriched, "summary": summary}


async def get_item_detail(client: MLClient, item_id: str) -> dict:
    """Retorna detalhes completos de um produto."""
    item = await client.get_item(item_id)
    return {
        "id": item.get("id"),
        "title": item.get("title"),
        "price": item.get("price"),
        "original_price": item.get("original_price"),
        "currency": item.get("currency_id"),
        "condition": item.get("condition"),
        "sold_quantity": item.get("sold_quantity", 0),
        "available_quantity": item.get("available_quantity", 0),
        "thumbnail": item.get("thumbnail"),
        "pictures": [p.get("url") for p in item.get("pictures", [])[:5]],
        "permalink": item.get("permalink"),
        "category_id": item.get("category_id"),
        "shipping": item.get("shipping", {}),
        "seller_id": item.get("seller_id"),
        "attributes": [
            {"name": a.get("name"), "value": a.get("value_name")}
            for a in item.get("attributes", [])[:10]
        ],
        "opportunity_score": _opportunity_score(item),
    }


async def get_trends(client: MLClient) -> list[dict]:
    """Retorna tendências de busca do ML para o site configurado."""
    trends = await client.get_trends()
    return [{"keyword": t.get("keyword"), "url": t.get("url")} for t in trends[:20]]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _opportunity_score(item: dict[str, Any]) -> float:
    """
    Score simples de oportunidade (0-100).
    Leva em conta: volume de vendas, frete grátis, condição nova.
    """
    score = 0.0
    sold = item.get("sold_quantity", 0) or 0
    score += min(sold / 10, 40)  # até 40 pontos por volume
    if item.get("shipping", {}).get("free_shipping"):
        score += 20
    if item.get("condition") == "new":
        score += 20
    price = item.get("price") or 0
    if price > 0:
        score += min(price / 100, 20)  # até 20 pontos por preço
    return round(min(score, 100), 1)


def _keyword_cloud(titles: list[str]) -> list[dict]:
    """Conta palavras frequentes nos títulos (exclui stopwords simples)."""
    stop = {
        "de", "da", "do", "para", "com", "em", "e", "a", "o", "um", "uma",
        "no", "na", "os", "as", "por", "ao", "à", "cm", "ml", "g", "kg",
        "kit", "novo", "original", "promoção",
    }
    counts: dict[str, int] = {}
    for title in titles:
        for word in title.lower().split():
            word = word.strip(".,/-()[]")
            if len(word) > 2 and word not in stop:
                counts[word] = counts.get(word, 0) + 1

    return [
        {"word": w, "count": c}
        for w, c in sorted(counts.items(), key=lambda x: -x[1])[:20]
    ]
