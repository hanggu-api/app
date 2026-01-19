from workers import WorkerEntrypoint, Response
from pyodide.ffi import to_js
from js import Float32Array, JSON
import json
import time

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        path = request.url
        method = request.method

        if method == "GET" and path.endswith("/health"):
            return Response.json({"ok": True, "service": "AI Python Worker"})

        if method == "POST" and path.endswith("/classify"):
            raw = await request.text()
            try:
                body = json.loads(raw)
            except Exception:
                try:
                    fixed = raw.replace("'", "\"")
                    body = json.loads(fixed)
                except Exception:
                    return Response.json({"error": "Invalid JSON"}, status=400)

            text = (body.get("text") or "").strip()
            if not text:
                return Response.json({"error": "Text is required"}, status=400)

            top_k = 3
            try:
                if "topK" in body:
                    v = int(body.get("topK"))
                    if v > 0:
                        top_k = min(v, 10)
            except Exception:
                top_k = 3

            filter_obj = body.get("filter") or None

            embed = await self.env.AI.run(
                "@cf/baai/bge-small-en-v1.5",
                { "text": [text], "pooling": "cls" }
            )
            embed_py = embed.to_py()
            data = embed_py.get("data") or []
            if not data or not data[0]:
                return Response.json({"error": "Embedding failed"}, status=500)
            vector = data[0]

            vector_js = to_js(vector)
            opts = { "topK": top_k, "returnMetadata": "all" }
            if filter_obj:
                try:
                    # ensure plain JS object
                    opts["filter"] = filter_obj
                except Exception:
                    pass
            opts_js = JSON.parse(json.dumps(opts))
            result = await self.env.VECTORIZE.query(vector_js, opts_js)
            result_py = result.to_py()
            matches = result_py.get("matches", [])
            if not matches:
                return Response.json({
                    "id": 0,
                    "name": "",
                    "score": -1,
                    "category_name": "Geral",
                    "alternatives": []
                })

            alts = []
            for mm in matches:
                meta2 = mm.get("metadata", {}) or {}
                alts.append({
                    "id": meta2.get("profession_id", 0),
                    "name": meta2.get("profession_name", ""),
                    "score": mm.get("score", 0),
                    "category_id": meta2.get("category_id", 0),
                    "category_name": meta2.get("category_name", "Geral"),
                    "service_type": meta2.get("service_type", None),
                    "task_id": meta2.get("task_id", None),
                    "task_name": meta2.get("task_name", None),
                    "unit_name": meta2.get("unit_name", None),
                    "unit_price": meta2.get("unit_price", None),
                    "pricing_type": meta2.get("pricing_type", None),
                    "text": meta2.get("text", None)
                })
            top = alts[0]
            return Response.json({
                "id": top.get("id", 0),
                "name": top.get("name", ""),
                "score": top.get("score", 0),
                "category_id": top.get("category_id", 0),
                "category_name": top.get("category_name", "Geral"),
                "service_type": top.get("service_type", None),
                "alternatives": alts
            })

        if method == "POST" and path.endswith("/teach"):
            raw = await request.text()
            try:
                body = json.loads(raw)
            except Exception:
                try:
                    fixed = raw.replace("'", "\"")
                    body = json.loads(fixed)
                except Exception:
                    return Response.json({"error": "Invalid JSON"}, status=400)

            text = (body.get("text") or "").strip()
            if not text or not body.get("profession_name"):
                return Response.json({"error": "Missing parameters"}, status=400)

            embed = await self.env.AI.run(
                "@cf/baai/bge-small-en-v1.5",
                { "text": [text], "pooling": "cls" }
            )
            embed_py = embed.to_py()
            data = embed_py.get("data") or []
            if not data or not data[0]:
                return Response.json({"error": "Embedding failed"}, status=500)
            vector = data[0]

            item_id = f"train_{body.get('profession_id', 0)}_{abs(hash(text))}"
            payload = [{
                "id": item_id,
                "values": vector,
                "metadata": (lambda b: (
                    (lambda base: (
                        (lambda extra: { **base, **extra })(
                            { k: b[k] for k in ["task_id","task_name","unit_name","unit_price","pricing_type","keywords"] if k in b }
                        )
                    ))({
                        "profession_id": b.get("profession_id", 0),
                        "profession_name": b.get("profession_name", ""),
                        "category_id": b.get("category_id", 0),
                        "category_name": b.get("category_name", "Geral"),
                        "text": text,
                        "service_type": b.get("service_type", None),
                        "type": "training",
                        "created_at": int(time.time())
                    })
                ))(body)
            }]
            try:
                payload_js = JSON.parse(json.dumps(payload))
                mutation = await self.env.VECTORIZE.upsert(payload_js)
                return Response.json({"success": True, "mutation": mutation.to_py()})
            except Exception as e:
                return Response.json({"success": False, "error": str(e)}, status=500)

        if method == "POST" and path.endswith("/debug_embed"):
            raw = await request.text()
            try:
                body = json.loads(raw)
            except Exception:
                try:
                    fixed = raw.replace("'", "\"")
                    body = json.loads(fixed)
                except Exception:
                    return Response.json({"error": "Invalid JSON"}, status=400)
            text = (body.get("text") or "").strip()
            embed = await self.env.AI.run(
                "@cf/baai/bge-small-en-v1.5",
                { "text": [text], "pooling": "cls" }
            )
            py = embed.to_py()
            return Response.json({"embed": py})

        if method == "GET" and path.endswith("/describe"):
            try:
                details = await self.env.VECTORIZE.describe()
                return Response.json(details.to_py())
            except Exception as e:
                return Response.json({"error": str(e)}, status=500)

        return Response.json({"error": "Not found"}, status=404)
