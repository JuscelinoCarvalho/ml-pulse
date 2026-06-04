"""
Serviço de Análise de Vendas e Métricas do Seller.
"""
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from app.services.ml_client import MLClient


async def get_dashboard(client: MLClient, days: int = 30) -> dict:
    """
    Retorna métricas consolidadas de vendas para o período informado.
    """
    me = await client.get_me()
    user_id = str(me["id"])

    # Busca pedidos paginados
    all_orders = await _fetch_all_orders(client, user_id, days)

    # Métricas
    revenue = sum(o["total_amount"] for o in all_orders)
    units_sold = sum(
        sum(i["quantity"] for i in o.get("order_items", []))
        for o in all_orders
    )
    ticket_avg = revenue / len(all_orders) if all_orders else 0

    # Agrupamento por dia
    daily: dict[str, dict] = defaultdict(lambda: {"revenue": 0.0, "orders": 0, "units": 0})
    for order in all_orders:
        day = order["date_closed"][:10]
        daily[day]["revenue"] += order["total_amount"]
        daily[day]["orders"] += 1
        daily[day]["units"] += sum(i["quantity"] for i in order.get("order_items", []))

    daily_series = sorted(
        [{"date": d, **v} for d, v in daily.items()],
        key=lambda x: x["date"],
    )

    # Top produtos
    product_sales: dict[str, dict] = defaultdict(lambda: {"title": "", "units": 0, "revenue": 0.0})
    for order in all_orders:
        for item in order.get("order_items", []):
            pid = str(item.get("item", {}).get("id", ""))
            if not pid:
                continue
            product_sales[pid]["title"] = item.get("item", {}).get("title", pid)
            product_sales[pid]["units"] += item["quantity"]
            product_sales[pid]["revenue"] += item["unit_price"] * item["quantity"]

    top_products = sorted(product_sales.values(), key=lambda x: -x["revenue"])[:10]

    # Reputação do seller
    rep = me.get("seller_reputation", {})
    reputation = {
        "level": rep.get("level_id", ""),
        "power_seller": rep.get("power_seller_status", ""),
        "transactions_completed": rep.get("transactions", {}).get("completed", 0),
        "ratings_positive": rep.get("ratings", {}).get("positive", 0),
        "cancellations_rate": rep.get("metrics", {}).get("cancellations", {}).get("rate", 0),
        "delayed_handling_rate": rep.get("metrics", {}).get("delayed_handling_time", {}).get("rate", 0),
    }

    return {
        "user": {"id": user_id, "nickname": me.get("nickname")},
        "period_days": days,
        "summary": {
            "revenue": round(revenue, 2),
            "orders": len(all_orders),
            "units_sold": units_sold,
            "ticket_avg": round(ticket_avg, 2),
        },
        "daily_series": daily_series,
        "top_products": top_products,
        "reputation": reputation,
        "recent_orders": _format_orders(all_orders[:10]),
    }


async def get_orders_list(client: MLClient, days: int = 7) -> list[dict]:
    me = await client.get_me()
    orders = await _fetch_all_orders(client, str(me["id"]), days)
    return _format_orders(orders)


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _fetch_all_orders(client: MLClient, seller_id: str, days: int) -> list[dict]:
    """Busca todos os pedidos paginando até o limite."""
    cutoff = datetime.now(UTC) - timedelta(days=days)
    offset = 0
    limit = 50
    all_orders = []

    while True:
        data = await client.get_orders(seller_id, limit=limit, offset=offset)
        results = data.get("results", [])
        if not results:
            break

        for order in results:
            closed_str = order.get("date_closed", "")
            if not closed_str:
                continue
            closed = datetime.fromisoformat(closed_str.replace("Z", "+00:00"))
            if closed < cutoff:
                return all_orders  # Pedidos vêm em ordem decrescente
            if order.get("status") not in ("cancelled",):
                all_orders.append(order)

        if len(results) < limit:
            break
        offset += limit

    return all_orders


def _format_orders(orders: list[dict]) -> list[dict]:
    return [
        {
            "id": o.get("id"),
            "date": o.get("date_closed", "")[:10],
            "status": o.get("status"),
            "total": o.get("total_amount"),
            "buyer": o.get("buyer", {}).get("nickname", ""),
            "items": [
                {
                    "title": i.get("item", {}).get("title", ""),
                    "quantity": i.get("quantity"),
                    "unit_price": i.get("unit_price"),
                }
                for i in o.get("order_items", [])
            ],
        }
        for o in orders
    ]
