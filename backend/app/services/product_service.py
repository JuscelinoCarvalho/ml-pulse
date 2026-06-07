"""
Serviço de Pesquisa e Análise de Produtos.
Aplica lógica de negócio sobre os dados brutos da API ML.

Usa o Buscador de Produtos (catálogo): GET /products/search — o endpoint
/sites/MLB/search (busca de itens) está bloqueado (403) para esta aplicação.
Cada produto do catálogo é enriquecido com suas ofertas reais via
GET /products/{id}/items (preço, concorrência, frete).
"""
import asyncio
from typing import Any

from app.config import settings
from app.services.ml_client import MLClient


async def search_and_analyze(
    client: MLClient,
    query: str,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """
    Busca produtos no catálogo (paginado) e retorna análise enriquecida com
    ofertas reais:
    - Menor preço e nº de concorrentes (ofertas) por produto
    - Faixa de preço (min/máx/médio) do mercado pesquisado
    - Marcas mais comuns e nuvem de palavras-chave
    - Score de oportunidade (menos concorrência + margem de preço)
    """
    raw = await client.get(
        "/products/search",
        site_id=settings.ml_site_id,
        status="active",
        q=query,
        limit=min(limit, 200),
        offset=offset,
    )
    products = raw.get("results", [])
    paging = raw.get("paging", {})

    if not products:
        return {
            "query": query,
            "items": [],
            "summary": {
                "total_found": paging.get("total", 0),
                "analyzed": 0,
                "limit": limit,
                "offset": offset,
            },
        }

    # Enriquece cada produto com suas ofertas, com concorrência limitada.
    sem = asyncio.Semaphore(15)

    async def _enrich(product_id: str | None) -> list[dict]:
        async with sem:
            return await _get_offers(client, product_id)

    offers_per_product = await asyncio.gather(
        *[_enrich(p.get("id")) for p in products],
        return_exceptions=True,
    )

    all_prices: list[float] = []
    brand_counts: dict[str, int] = {}
    enriched = []

    for product, offers in zip(products, offers_per_product):
        if isinstance(offers, Exception):
            offers = []
        prices = [o["price"] for o in offers if o.get("price")]
        all_prices.extend(prices)

        brand = _attr(product, "BRAND")
        if brand:
            brand_counts[brand] = brand_counts.get(brand, 0) + 1

        pics = product.get("pictures") or []
        thumb = pics[0].get("url") if pics and isinstance(pics[0], dict) else ""
        free = any((o.get("shipping") or {}).get("free_shipping") for o in offers)

        enriched.append({
            "id": product.get("id"),
            "title": product.get("name"),
            "brand": brand,
            "price": min(prices) if prices else 0,
            "price_max": max(prices) if prices else 0,
            "offers_count": len(offers),
            "thumbnail": thumb,
            "permalink": f"https://www.mercadolivre.com.br/p/{product.get('id')}",
            "shipping_free": free,
            "opportunity_score": _catalog_opportunity(len(offers), prices),
        })

    enriched.sort(key=lambda x: x["opportunity_score"], reverse=True)

    summary = {
        "total_found": paging.get("total", 0),
        "analyzed": len(enriched),
        "limit": limit,
        "offset": offset,
        "price_min": min(all_prices) if all_prices else 0,
        "price_max": max(all_prices) if all_prices else 0,
        "price_avg": round(sum(all_prices) / len(all_prices), 2) if all_prices else 0,
        "top_brands": [
            {"brand": b, "count": c}
            for b, c in sorted(brand_counts.items(), key=lambda x: -x[1])[:8]
        ],
        "keyword_cloud": _keyword_cloud([p.get("name", "") for p in products]),
    }

    return {"query": query, "items": enriched, "summary": summary}


async def _get_offers(client: MLClient, product_id: str | None) -> list[dict]:
    """Retorna as ofertas (listagens) de um produto de catálogo."""
    if not product_id:
        return []
    data = await client.get(f"/products/{product_id}/items")
    return data.get("results", [])


def _attr(product: dict, attr_id: str) -> str | None:
    for a in product.get("attributes", []):
        if a.get("id") == attr_id:
            return a.get("value_name")
    return None


def _catalog_opportunity(offers_count: int, prices: list[float]) -> float:
    """Score 0-100: menos concorrência + maior dispersão de preço = mais oportunidade."""
    score = 0.0
    # baixa concorrência (mas com mercado ativo) = mais oportunidade (até 50 pts).
    # 0 ofertas normalmente é entrada "fantasma" do catálogo, sem mercado real.
    if offers_count == 0:
        score += 5
    elif offers_count <= 3:
        score += 50
    elif offers_count <= 7:
        score += 30
    elif offers_count <= 15:
        score += 15
    # dispersão de preço entre vendedores = margem (até 30 pts)
    if len(prices) > 1:
        spread = (max(prices) - min(prices)) / max(prices)
        score += min(spread * 60, 30)
    # ticket (até 20 pts)
    if prices:
        score += min(min(prices) / 100, 20)
    return round(min(score, 100), 1)


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
