import json
import logging
import mimetypes
import urllib.parse
import threading
import webbrowser

from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from decimal import InvalidOperation, Decimal
from app.config import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"


def parse_decimal(value, default: str = "0") -> float:
    if value is None or value == "":
        value = default

    raw = str(value).strip()

    # Formato brasileiro: 3.990,00
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")

    # Formato brasileiro simples: 3990,00
    elif "," in raw:
        raw = raw.replace(",", ".")

    # Formato americano/Supabase: 3990.00
    # mantém como está
    try:
        return float(Decimal(raw))
    except (InvalidOperation, ValueError):
        return float(default)


def money(value) -> float:
    return round(parse_decimal(value), 2)


class BackendHandler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200, headers=None):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

    def send_error_json(self, message, status=400):
        self.send_json({"error": message}, status)

    def serve_static(self, url_path):
        routes = {
            "/pages/login": FRONTEND_DIR / "pages" / "login.html",
            "/pages/dashboard": FRONTEND_DIR / "pages" / "dashboard.html",
            "/pages/entidades": FRONTEND_DIR / "pages" / "entidades.html",
            "/pages/produtos": FRONTEND_DIR / "pages" / "produtos.html",
            "/pages/plano-contas": FRONTEND_DIR / "pages" / "plano_contas.html",
            "/pages/compras": FRONTEND_DIR / "pages" / "compras.html",
            "/pages/vendas": FRONTEND_DIR / "pages" / "vendas.html",
            "/pages/contas-receber": FRONTEND_DIR / "pages" / "contas_receber.html",
            "/pages/contas-pagar": FRONTEND_DIR / "pages" / "contas_pagar.html",
            "/pages/fluxo-caixa": FRONTEND_DIR / "pages" / "fluxo_caixa.html",
            "/pages/lucratividade": FRONTEND_DIR / "pages" / "lucratividade.html",
            "/pages/dre": FRONTEND_DIR / "pages" / "dre.html",
            "/pages/balanco": FRONTEND_DIR / "pages" / "balanco.html",
            "/pages/impostos": FRONTEND_DIR / "pages" / "impostos.html",
            "/pages/usuarios": FRONTEND_DIR / "pages" / "usuarios.html",
        }
        file_path = routes.get(url_path, FRONTEND_DIR / url_path.lstrip("/"))

        if not file_path.exists() or not file_path.is_file():
            self.send_error_json("Not found", 404)
            return

        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "application/octet-stream"
        if file_path.suffix == ".html":
            mime_type = "text/html; charset=utf-8"

        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.end_headers()

        with open(file_path, "rb") as f:
            self.wfile.write(f.read())

    def get_token_from_cookie(self):
        cookies = self.headers.get("Cookie")
        if not cookies:
            return None

        for cookie in cookies.split(";"):
            cookie = cookie.strip()
            if cookie.startswith("sb_access_token="):
                return cookie.split("=", 1)[1]

        return None

    def require_auth(self):
        token = self.get_token_from_cookie()

        if not token:
            self.send_error_json("Unauthorized", 401)
            return None

        try:
            user = supabase.auth.get_user(token)
            if not user:
                self.send_error_json("Unauthorized", 401)
                return None
            return user.user
        except Exception as e:
            logger.error(f"Auth error: {e}")
            self.send_error_json("Unauthorized", 401)
            return None

    def get_user_profile(self, user):
        """
        Busca o perfil do usuário logado no banco.

        Tabelas usadas:
        - usuarios_perfis.user_id
        - usuarios_perfis.perfil_id
        - usuarios_perfis.ativo
        - perfis_acesso.nome

        Se não encontrar perfil ativo, usa Vendedor como padrão.
        """
        user_id = str(getattr(user, "id", "") or "").strip()
        email = str(getattr(user, "email", "") or "").strip().lower()

        try:
            if user_id:
                # 1) Busca o vínculo do usuário com o perfil
                vinculo_res = (
                    supabase.table("usuarios_perfis")
                    .select("perfil_id")
                    .eq("user_id", user_id)
                    .eq("ativo", True)
                    .limit(1)
                    .execute()
                )

                if vinculo_res.data:
                    perfil_id = vinculo_res.data[0].get("perfil_id")

                    # 2) Busca o nome do perfil na tabela perfis_acesso
                    perfil_res = (
                        supabase.table("perfis_acesso")
                        .select("nome")
                        .eq("id", perfil_id)
                        .limit(1)
                        .execute()
                    )

                    if perfil_res.data:
                        nome_perfil = str(perfil_res.data[0].get("nome") or "").strip().upper()

                        if nome_perfil == "ADMIN":
                            return "ADMIN"

                        if nome_perfil == "FINANCEIRO":
                            return "FINANCEIRO"

                        if nome_perfil == "ESTOQUE":
                            return "ESTOQUE"

                        if nome_perfil == "VENDEDOR":
                            return "VENDEDOR"

        except Exception as e:
            logger.error(f"Erro ao buscar perfil no banco: {e}")

        # Fallback: metadata ou admin pelo e-mail
        metadata = getattr(user, "user_metadata", None) or {}
        perfil = metadata.get("perfil") or metadata.get("role") or metadata.get("tipo")

        if perfil:
            perfil = str(perfil).strip().upper()
        else:
            perfil = ""

        if email == "admin@erp.com" or perfil == "ADMIN":
            return "ADMIN"

        if perfil == "FINANCEIRO":
            return "FINANCEIRO"

        if perfil == "ESTOQUE":
            return "ESTOQUE"

        return "VENDEDOR"

    def can_access_page(self, user, path):
        perfil = self.get_user_profile(user)

        if perfil == "ADMIN":
            return True

        vendedor_pages = [
            "/pages/dashboard",
            "/pages/entidades",
            "/pages/produtos",
            "/pages/vendas",
        ]

        estoque_pages = [
            "/pages/dashboard",
            "/pages/produtos",
            "/pages/compras",
        ]

        financeiro_pages = [
            "/pages/dashboard",
            "/pages/contas-receber",
            "/pages/contas-pagar",
            "/pages/fluxo-caixa",
            "/pages/lucratividade",
            "/pages/dre",
            "/pages/balanco",
            "/pages/impostos",
        ]

        if perfil == "VENDEDOR":
            return path in vendedor_pages

        if perfil == "ESTOQUE":
            return path in estoque_pages

        if perfil == "FINANCEIRO":
            return path in financeiro_pages

        return False

    def can_access_api(self, user, path, method="GET"):
        perfil = self.get_user_profile(user)

        if perfil == "ADMIN":
            return True

        vendedor_get = [
            "/api/me",
            "/api/produtos",
            "/api/entidades",
            "/api/vendas",
            "/api/movimentacoes-estoque",
        ]

        vendedor_post = [
            "/api/vendas",
            "/api/entidades",
        ]

        estoque_get = [
            "/api/me",
            "/api/produtos",
            "/api/compras",
            "/api/movimentacoes-estoque",
        ]

        estoque_post = [
            "/api/produtos",
            "/api/compras",
        ]

        financeiro_get = [
            "/api/me",
            "/api/contas-receber",
            "/api/contas-pagar",
            "/api/fluxo-caixa",
            "/api/lucratividade",
            "/api/dre",
            "/api/balanco",
            "/api/impostos",
            "/api/vendas",
            "/api/compras",
        ]

        if perfil == "VENDEDOR":
            if method == "GET":
                return (
                    path in vendedor_get
                    or (path.startswith("/api/vendas/") and path.endswith("/comprovante"))
                )
            if method == "POST":
                return path in vendedor_post
            if method in ["PUT", "PATCH"]:
                return path.startswith("/api/entidades/")
            return False

        if perfil == "ESTOQUE":
            if method == "GET":
                return path in estoque_get
            if method == "POST":
                return path in estoque_post
            if method in ["PUT", "PATCH"]:
                return path.startswith("/api/produtos/")
            return False

        if perfil == "FINANCEIRO":
            if method == "GET":
                return path in financeiro_get
            return False

        return False

    def require_permission(self, user, path, method="GET"):
        if self.can_access_api(user, path, method):
            return True

        self.send_error_json("Sem permissão para acessar este recurso.", 403)
        return False

    def read_json_body(self):
        content_length_header = self.headers.get("Content-Length")
        content_length = int(content_length_header) if content_length_header else 0
        raw_body = self.rfile.read(content_length)

        try:
            return json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except Exception:
            return {}

    def get_produto(self, produto_id):
        res = supabase.table("produtos").select("*").eq("id", produto_id).execute()
        return res.data[0] if res.data else None

    def anexar_produtos_aos_itens_venda(self, itens):
        """
        Evita erro PGRST200 do Supabase/PostgREST quando ainda não existe
        relacionamento FK no schema cache entre itens_venda.produto_id e produtos.id.
        Em vez de usar .select("*, produto:produto_id(*)"), busca os produtos
        manualmente e anexa no campo produto.
        """
        itens = itens or []

        produto_ids = []
        for item in itens:
            produto_id = item.get("produto_id")
            if produto_id not in [None, "", 0, "0"]:
                produto_ids.append(produto_id)

        produto_ids = list(dict.fromkeys(produto_ids))

        if not produto_ids:
            return itens

        try:
            produtos_res = (
                supabase.table("produtos")
                .select("*")
                .in_("id", produto_ids)
                .execute()
            )

            produtos_por_id = {
                str(produto.get("id")): produto
                for produto in produtos_res.data or []
            }

            for item in itens:
                item["produto"] = produtos_por_id.get(str(item.get("produto_id")), {})

        except Exception as e:
            logger.error(f"Erro ao anexar produtos aos itens da venda: {e}")
            for item in itens:
                item["produto"] = {}

        return itens

    def atualizar_produto_estoque(self, produto_id, novo_estoque, novo_custo_medio=None):
        payload = {
            "estoque_atual": round(float(novo_estoque), 3)
        }

        if novo_custo_medio is not None:
            payload["custo_medio"] = round(float(novo_custo_medio), 2)
            payload["preco_custo"] = round(float(novo_custo_medio), 2)

            produto = self.get_produto(produto_id)
            if produto:
                preco_venda = parse_decimal(produto.get("preco_venda", 0))
                payload["margem_lucro"] = (
                    ((preco_venda - payload["preco_custo"]) / payload["preco_custo"]) * 100
                    if payload["preco_custo"] > 0
                    else 0
                )

        res = supabase.table("produtos").update(payload).eq("id", produto_id).execute()
        return res.data[0] if res.data else None

    def registrar_movimentacao(
        self,
        produto_id,
        tipo,
        origem,
        origem_id,
        quantidade,
        saldo_anterior,
        saldo_novo,
        custo_anterior=None,
        custo_novo=None,
        motivo="",
        usuario_id=None
    ):
        payload = {
            "produto_id": produto_id,
            "tipo": tipo,
            "origem": origem,
            "origem_id": origem_id,
            "quantidade": round(float(quantidade), 3),
            "saldo_anterior": round(float(saldo_anterior), 3),
            "saldo_novo": round(float(saldo_novo), 3),
            "custo_anterior": round(float(custo_anterior), 2) if custo_anterior is not None else None,
            "custo_novo": round(float(custo_novo), 2) if custo_novo is not None else None,
            "motivo": motivo,
            "usuario_id": usuario_id,
        }

        return supabase.table("movimentacoes_estoque").insert(payload).execute()

    def normalizar_data_vencimento(self, data):
        data_vencimento = data.get("data_vencimento") or data.get("vencimento")
        if data_vencimento:
            return str(data_vencimento).split("T")[0]
        return date.today().isoformat()

    def somar_valores(self, registros, campo="valor", apenas_pendente=False):
        total = 0
        for item in registros or []:
            if apenas_pendente and str(item.get("status", "")).upper() in ["PAGO", "PAGA", "QUITADO", "QUITADA"]:
                continue
            total += float(item.get(campo) or 0)
        return round(total, 2)

    def calcular_cmv_vendas(self):
        itens = supabase.table("itens_venda").select("*").execute()
        cmv = 0
        for item in itens.data or []:
            quantidade = parse_decimal(item.get("quantidade", 0))
            custo = money(item.get("custo_unitario", 0))
            cmv += quantidade * custo
        return round(cmv, 2)

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/pages/login")
            self.end_headers()
            return

        if path == "/logout":
            self.send_response(302)
            self.send_header("Location", "/pages/login")
            self.send_header(
                "Set-Cookie",
                "sb_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
            )
            self.end_headers()
            return

        clean_routes = [
            "/login",
            "/dashboard",
            "/entidades",
            "/produtos",
            "/plano-contas",
            "/compras",
            "/vendas",
            "/contas-receber",
            "/contas-pagar",
            "/fluxo-caixa",
            "/lucratividade",
            "/dre",
            "/balanco",
            "/impostos",
            "/usuarios",
        ]

        if path in clean_routes:
            self.send_response(302)
            self.send_header(
                "Location",
                f"/pages{path}" if path == "/login" else f"/pages/{path.lstrip('/')}"
            )
            self.end_headers()
            return

        if not path.startswith("/api/"):
            if path.startswith("/pages/") and path != "/pages/login":
                user = self.require_auth()
                if not user:
                    return

                if not self.can_access_page(user, path):
                    self.send_error_json("Sem permissão para acessar esta página.", 403)
                    return

            return self.serve_static(path)

        if path == "/api/me":
            token = self.get_token_from_cookie()

            try:
                user = supabase.auth.get_user(token) if token else None

                if user and user.user:
                    u = user.user
                    self.send_json({
                        "authenticated": True,
                        "user": {
                            "id": u.id,
                            "email": u.email,
                            "nome": u.user_metadata.get("nome", "Usuário") if u.user_metadata else "Usuário",
                            "perfil": self.get_user_profile(u),
                        },
                    })
                else:
                    self.send_json({"authenticated": False}, 401)
            except Exception:
                self.send_json({"authenticated": False}, 401)

            return

        user = self.require_auth()
        if not user:
            return

        if not self.require_permission(user, path, "GET"):
            return

        try:
            if path == "/api/produtos":
                res = supabase.table("produtos").select("*").order("id", desc=True).execute()
                self.send_json(res.data)

            elif path == "/api/entidades":
                res = supabase.table("entidades").select("*").order("id", desc=True).execute()
                self.send_json(res.data)

            elif path == "/api/plano-contas":
                res = (
                    supabase.table("plano_contas")
                    .select("*, conta_pai:conta_pai_id(*)")
                    .order("codigo")
                    .execute()
                )
                self.send_json(res.data)

            elif path == "/api/compras":
                res = (
                    supabase.table("compras")
                    .select("*, fornecedor:fornecedor_id(*), itens_compra(*)")
                    .order("id", desc=True)
                    .execute()
                )
                self.send_json(res.data)

            elif path == "/api/vendas":
                res = (
                    supabase.table("vendas")
                    .select("*, cliente:cliente_id(*), itens_venda(*)")
                    .order("id", desc=True)
                    .execute()
                )
                self.send_json(res.data)

            elif path == "/api/contas-receber":
                res = (
                    supabase.table("contas_receber")
                    .select("*")
                    .order("id", desc=True)
                    .execute()
                )
                self.send_json(res.data)

            elif path == "/api/contas-pagar":
                res = (
                    supabase.table("contas_pagar")
                    .select("*")
                    .order("id", desc=True)
                    .execute()
                )
                self.send_json(res.data)

            elif path == "/api/fluxo-caixa":
                hoje = date.today()
                amanha = hoje + timedelta(days=1)
                inicio_mes = hoje.replace(day=1).isoformat()
                hoje_iso = hoje.isoformat()
                amanha_iso = amanha.isoformat()

                receber_res = supabase.table("contas_receber").select("*").execute()
                pagar_res = supabase.table("contas_pagar").select("*").execute()

                receber = receber_res.data or []
                pagar = pagar_res.data or []

                receber_mes = [
                    c for c in receber
                    if str(c.get("data_vencimento") or "") >= inicio_mes
                    and str(c.get("status", "")).upper() not in ["PAGO", "PAGA", "QUITADO", "QUITADA"]
                ]

                pagar_mes = [
                    c for c in pagar
                    if str(c.get("data_vencimento") or "") >= inicio_mes
                    and str(c.get("status", "")).upper() not in ["PAGO", "PAGA", "QUITADO", "QUITADA"]
                ]

                receber_hoje = [c for c in receber_mes if str(c.get("data_vencimento") or "") == hoje_iso]
                receber_amanha = [c for c in receber_mes if str(c.get("data_vencimento") or "") == amanha_iso]
                pagar_hoje = [c for c in pagar_mes if str(c.get("data_vencimento") or "") == hoje_iso]
                pagar_amanha = [c for c in pagar_mes if str(c.get("data_vencimento") or "") == amanha_iso]

                total_receber_mes = self.somar_valores(receber_mes)
                total_pagar_mes = self.somar_valores(pagar_mes)

                self.send_json({
                    "data_base": hoje_iso,
                    "receber_mes": total_receber_mes,
                    "pagar_mes": total_pagar_mes,
                    "saldo_previsto": round(total_receber_mes - total_pagar_mes, 2),
                    "receber_hoje": self.somar_valores(receber_hoje),
                    "receber_amanha": self.somar_valores(receber_amanha),
                    "pagar_hoje": self.somar_valores(pagar_hoje),
                    "pagar_amanha": self.somar_valores(pagar_amanha),
                    "contas_receber_hoje": receber_hoje,
                    "contas_receber_amanha": receber_amanha,
                    "contas_pagar_hoje": pagar_hoje,
                    "contas_pagar_amanha": pagar_amanha,
                })

            elif path == "/api/lucratividade":
                itens_res = (
                    supabase.table("itens_venda")
                    .select("*")
                    .execute()
                )

                itens_venda = self.anexar_produtos_aos_itens_venda(itens_res.data or [])

                linhas = []
                receita_total = 0
                custo_total = 0

                for item in itens_venda:
                    quantidade = parse_decimal(item.get("quantidade", 0))
                    preco = money(item.get("preco_unitario", 0))
                    custo = money(item.get("custo_unitario", 0))
                    receita = round(quantidade * preco, 2)
                    custo_venda = round(quantidade * custo, 2)
                    lucro = round(receita - custo_venda, 2)

                    receita_total += receita
                    custo_total += custo_venda

                    produto = item.get("produto") or {}
                    linhas.append({
                        "produto_id": item.get("produto_id"),
                        "produto_nome": produto.get("nome") or f"Produto #{item.get('produto_id')}",
                        "quantidade": quantidade,
                        "preco_unitario": preco,
                        "custo_unitario": custo,
                        "receita": receita,
                        "custo_total": custo_venda,
                        "lucro": lucro,
                        "margem_percentual": round((lucro / receita) * 100, 2) if receita > 0 else 0,
                    })

                lucro_total = round(receita_total - custo_total, 2)

                self.send_json({
                    "receita_total": round(receita_total, 2),
                    "custo_total": round(custo_total, 2),
                    "lucro_total": lucro_total,
                    "margem_percentual": round((lucro_total / receita_total) * 100, 2) if receita_total > 0 else 0,
                    "itens": linhas,
                })

            elif path == "/api/impostos":
                vendas = supabase.table("vendas").select("*").execute()
                receita = sum(float(v.get("total") or 0) for v in vendas.data or [])
                aliquota_simples = 0.06
                imposto = round(receita * aliquota_simples, 2)

                self.send_json({
                    "regime": "Simples Nacional",
                    "aliquota": aliquota_simples,
                    "aliquota_percentual": 6,
                    "receita_bruta": round(receita, 2),
                    "imposto_estimado": imposto,
                })

            elif path == "/api/dre":
                vendas = supabase.table("vendas").select("*").execute()
                receita = sum(float(v.get("total") or 0) for v in vendas.data or [])
                cmv = self.calcular_cmv_vendas()
                lucro_bruto = round(receita - cmv, 2)
                imposto_simples = round(receita * 0.06, 2)
                lucro_liquido = round(lucro_bruto - imposto_simples, 2)

                self.send_json({
                    "receita_bruta": round(receita, 2),
                    "deducoes_impostos": imposto_simples,
                    "receita_liquida": round(receita - imposto_simples, 2),
                    "cmv": cmv,
                    "lucro_bruto": lucro_bruto,
                    "lucro_liquido": lucro_liquido,
                    "resultado": "LUCRO" if lucro_liquido >= 0 else "PREJUÍZO",
                })

            elif path == "/api/balanco":
                produtos = supabase.table("produtos").select("*").execute()
                receber_res = supabase.table("contas_receber").select("*").execute()
                pagar_res = supabase.table("contas_pagar").select("*").execute()

                estoque = sum(
                    float(p.get("estoque_atual") or 0) * float(p.get("custo_medio") or p.get("preco_custo") or 0)
                    for p in produtos.data or []
                )

                total_receber = self.somar_valores(receber_res.data, apenas_pendente=True)
                total_pagar = self.somar_valores(pagar_res.data, apenas_pendente=True)

                vendas = supabase.table("vendas").select("*").execute()
                compras = supabase.table("compras").select("*").execute()

                caixa_estimado = (
                    sum(float(v.get("total") or 0) for v in vendas.data or [])
                    - sum(float(c.get("total") or 0) for c in compras.data or [])
                )

                ativo = round(max(caixa_estimado, 0) + estoque + total_receber, 2)
                passivo = round(total_pagar, 2)
                patrimonio_liquido = round(ativo - passivo, 2)

                self.send_json({
                    "ativo": ativo,
                    "passivo": passivo,
                    "patrimonio_liquido": patrimonio_liquido,
                    "caixa_estimado": round(caixa_estimado, 2),
                    "estoque": round(estoque, 2),
                    "contas_receber": total_receber,
                    "contas_pagar": total_pagar,
                })

            elif path == "/api/movimentacoes-estoque":
                query = urllib.parse.parse_qs(parsed_path.query)
                produto_id = query.get("produto_id", [None])[0]

                consulta = supabase.table("movimentacoes_estoque").select(
                    "*, produto:produto_id(*)"
                )

                if produto_id:
                    consulta = consulta.eq("produto_id", produto_id)

                res = consulta.order("id", desc=True).execute()

                movimentos = []

                for mov in res.data:
                    produto = mov.get("produto") or {}

                    movimentos.append({
                        **mov,
                        "produto_nome": produto.get("nome"),
                        "custo_unitario": mov.get("custo_novo") or mov.get("custo_anterior") or 0,
                        "custo_medio": mov.get("custo_novo") or mov.get("custo_anterior") or 0,
                        "data": mov.get("created_at"),
                    })

                self.send_json(movimentos)


            elif path == "/api/usuarios":
                res = (
                    supabase.table("usuarios_perfis")
                    .select("*, perfil:perfil_id(*)")
                    .order("id", desc=True)
                    .execute()
                )
                self.send_json(res.data)

            elif path.startswith("/api/vendas/") and path.endswith("/comprovante"):
                venda_id = path.split("/")[-2]

                venda = (
                    supabase.table("vendas")
                    .select("*, cliente:cliente_id(*)")
                    .eq("id", venda_id)
                    .execute()
                )
                if not venda.data:
                    return self.send_error_json("Venda não encontrada.", 404)

                itens = (
                    supabase.table("itens_venda")
                    .select("*")
                    .eq("venda_id", venda_id)
                    .execute()
                )

                itens_com_produto = self.anexar_produtos_aos_itens_venda(itens.data or [])

                self.send_json({
                    "venda": venda.data[0],
                    "itens": itens_com_produto
                })

            else:
                self.send_error_json("Not found", 404)

        except Exception as e:
            logger.error(f"GET Error: {e}")
            self.send_error_json(str(e), 500)

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        data = self.read_json_body()

        if path == "/api/login":
            email = data.get("email", "").strip()
            password = data.get("password", "")

            if not email or not password:
                return self.send_error_json("E-mail e senha são obrigatórios.")

            try:
                auth_res = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })

                token = auth_res.session.access_token
                user = auth_res.user
                cookie = f"sb_access_token={token}; Path=/; HttpOnly; SameSite=Lax"

                self.send_json({
                    "message": "Login realizado com sucesso.",
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "nome": user.user_metadata.get("nome", "Usuário") if user.user_metadata else "Usuário",
                        "perfil": self.get_user_profile(user),
                    },
                }, headers={"Set-Cookie": cookie})
            except Exception:
                self.send_error_json(
                    "Falha de autenticação: Conta não encontrada ou senha inválida.",
                    401
                )

            return

        user = self.require_auth()
        if not user:
            return

        if not self.require_permission(user, path, "POST"):
            return

        try:
            if path == "/api/produtos":
                sku = data.get("sku", "").strip()
                nome = data.get("nome", "").strip()

                if not sku or not nome:
                    return self.send_error_json("SKU e Nome são obrigatórios.")

                pc = parse_decimal(data.get("preco_custo", "0"))
                pv = parse_decimal(data.get("preco_venda", "0"))
                custo_medio = parse_decimal(data.get("custo_medio", pc))
                margem = ((pv - pc) / pc * 100) if pc > 0 else 0

                payload = {
                    "sku": sku,
                    "nome": nome,
                    "descricao": data.get("descricao") or None,
                    "unidade_medida": data.get("unidade_medida") or "UN",
                    "preco_custo": pc,
                    "custo_medio": custo_medio if custo_medio > 0 else pc,
                    "preco_venda": pv,
                    "margem_lucro": margem,
                    "estoque_atual": parse_decimal(data.get("estoque_atual", "0")),
                    "estoque_minimo": parse_decimal(data.get("estoque_minimo", "0")),
                    "ativo": True,
                }

                exist = supabase.table("produtos").select("id").eq("sku", sku).execute()

                if exist.data:
                    return self.send_error_json(
                        "Já existe um produto com esse SKU cadastrado.",
                        409
                    )

                res = supabase.table("produtos").insert(payload).execute()
                self.send_json(res.data[0], 201)

            elif path == "/api/entidades":
                cpf_cnpj = data.get("cpf_cnpj", "").strip()

                if not cpf_cnpj or not data.get("nome_razao_social"):
                    return self.send_error_json("Nome e CPF/CNPJ são obrigatórios.")

                payload = {
                    "tipo_entidade": data.get("tipo_entidade", "").strip(),
                    "nome_razao_social": data.get("nome_razao_social", "").strip(),
                    "nome_fantasia": data.get("nome_fantasia") or None,
                    "cpf_cnpj": cpf_cnpj,
                    "inscricao_estadual": data.get("inscricao_estadual") or None,
                    "email": data.get("email") or None,
                    "telefone": data.get("telefone") or None,
                    "cep": data.get("cep") or None,
                    "logradouro": data.get("logradouro") or None,
                    "numero": data.get("numero") or None,
                    "bairro": data.get("bairro") or None,
                    "cidade": data.get("cidade") or None,
                    "uf": data.get("uf") or None,
                    "ativo": True,
                }

                exist = (
                    supabase.table("entidades")
                    .select("id")
                    .eq("cpf_cnpj", cpf_cnpj)
                    .execute()
                )

                if exist.data:
                    return self.send_error_json(
                        "Já existe um cadastro com esse CPF/CNPJ.",
                        409
                    )

                res = supabase.table("entidades").insert(payload).execute()
                self.send_json(res.data[0], 201)

            elif path == "/api/plano-contas":
                codigo = data.get("codigo", "").strip()

                if not codigo or not data.get("nome"):
                    return self.send_error_json("Código e Nome são obrigatórios.")

                cp_id = data.get("conta_pai_id")

                payload = {
                    "codigo": codigo,
                    "nome": data.get("nome", "").strip(),
                    "tipo_conta": data.get("tipo_conta", "").strip(),
                    "natureza": data.get("natureza", "").strip(),
                    "conta_pai_id": cp_id if cp_id not in [None, "", 0, "0"] else None,
                    "aceita_lancamento": bool(data.get("aceita_lancamento", True)),
                    "ativo": True,
                }

                exist = (
                    supabase.table("plano_contas")
                    .select("id")
                    .eq("codigo", codigo)
                    .execute()
                )

                if exist.data:
                    return self.send_error_json(
                        "Já existe uma conta com esse código.",
                        409
                    )

                res = supabase.table("plano_contas").insert(payload).execute()
                self.send_json(res.data[0], 201)

            elif path == "/api/compras":
                fornecedor_id = data.get("fornecedor_id")
                itens = data.get("itens", [])

                if not fornecedor_id:
                    return self.send_error_json("Selecione um fornecedor.")

                if not itens:
                    return self.send_error_json("Adicione pelo menos um produto na compra.")

                desconto = money(data.get("desconto", 0))
                total_bruto = 0
                itens_payload = []

                for item in itens:
                    produto_id = item.get("produto_id")
                    qtd = parse_decimal(item.get("quantidade", 0))
                    custo = money(item.get("custo_unitario", 0))

                    if not produto_id or qtd <= 0 or custo <= 0:
                        return self.send_error_json(
                            "Todos os itens da compra precisam de produto, quantidade e custo válidos."
                        )

                    subtotal = round(qtd * custo, 2)
                    total_bruto += subtotal

                    itens_payload.append({
                        "produto_id": produto_id,
                        "quantidade": qtd,
                        "custo_unitario": custo,
                        "subtotal": subtotal,
                    })

                total = max(round(total_bruto - desconto, 2), 0)

                compra_payload = {
                    "fornecedor_id": fornecedor_id,
                    "numero_pedido": data.get("numero_pedido") or None,
                    "nf_entrada": data.get("nf_entrada") or None,
                    "forma_pagamento": data.get("forma_pagamento") or None,
                    "status": "ABERTO",
                    "desconto": desconto,
                    "total": total,
                }

                compra = supabase.table("compras").insert(compra_payload).execute()
                compra_id = compra.data[0]["id"]

                conta_pagar_payload = {
                    "compra_id": compra_id,
                    "entidade_id": fornecedor_id,
                    "fornecedor_id": fornecedor_id,
                    "descricao": f"Compra #{compra_id}",
                    "valor": total,
                    "valor_original": total,
                    "valor_pago": 0,
                    "data_emissao": date.today().isoformat(),
                    "data_vencimento": self.normalizar_data_vencimento(data),
                    "status": "ABERTO",
                    "estornado": False,
                }

                supabase.table("contas_pagar").insert(conta_pagar_payload).execute()

                for item in itens_payload:
                    item["compra_id"] = compra_id

                supabase.table("itens_compra").insert(itens_payload).execute()

                self.send_json({
                    "message": "Compra cadastrada com sucesso.",
                    "compra": compra.data[0]
                }, 201)

            elif path.startswith("/api/compras/") and path.endswith("/confirmar"):
                compra_id = path.split("/")[-2]

                compra_res = (
                    supabase.table("compras")
                    .select("*")
                    .eq("id", compra_id)
                    .execute()
                )

                if not compra_res.data:
                    return self.send_error_json("Compra não encontrada.", 404)

                compra = compra_res.data[0]

                if compra.get("status") == "confirmada":
                    return self.send_error_json("Essa compra já foi confirmada.", 409)

                itens_res = (
                    supabase.table("itens_compra")
                    .select("*")
                    .eq("compra_id", compra_id)
                    .execute()
                )

                if not itens_res.data:
                    return self.send_error_json("Essa compra não possui itens.")

                for item in itens_res.data:
                    produto = self.get_produto(item["produto_id"])

                    if not produto:
                        return self.send_error_json(
                            f"Produto {item['produto_id']} não encontrado.",
                            404
                        )

                    estoque_anterior = parse_decimal(produto.get("estoque_atual", 0))
                    custo_anterior = money(
                        produto.get("custo_medio") or produto.get("preco_custo", 0)
                    )

                    qtd = parse_decimal(item.get("quantidade", 0))
                    custo_compra = money(item.get("custo_unitario", 0))
                    estoque_novo = estoque_anterior + qtd

                    custo_medio = (
                        ((estoque_anterior * custo_anterior) + (qtd * custo_compra)) / estoque_novo
                        if estoque_novo > 0
                        else custo_compra
                    )

                    self.atualizar_produto_estoque(
                        item["produto_id"],
                        estoque_novo,
                        custo_medio
                    )

                    self.registrar_movimentacao(
                        produto_id=item["produto_id"],
                        tipo="ENTRADA",
                        origem="COMPRA",
                        origem_id=compra_id,
                        quantidade=qtd,
                        saldo_anterior=estoque_anterior,
                        saldo_novo=estoque_novo,
                        custo_anterior=custo_anterior,
                        custo_novo=custo_medio,
                        motivo=f"Confirmação da compra #{compra_id}",
                        usuario_id=None,
                    )

                atualizado = (
                    supabase.table("compras")
                    .update({
                        "status": "confirmada",
                        "nf_entrada": data.get("nf_entrada") or compra.get("nf_entrada"),
                        "forma_pagamento": data.get("forma_pagamento") or compra.get("forma_pagamento"),
                        "confirmado_em": "now()",
                    })
                    .eq("id", compra_id)
                    .execute()
                )

                self.send_json({
                    "message": "Compra confirmada e estoque atualizado com sucesso.",
                    "compra": atualizado.data[0] if atualizado.data else compra
                })

            elif path == "/api/vendas":
                cliente_id = data.get("cliente_id")
                itens = data.get("itens", [])

                if not cliente_id:
                    return self.send_error_json("Selecione um cliente.")

                if not itens:
                    return self.send_error_json("Adicione pelo menos um produto na venda.")

                desconto = money(data.get("desconto", 0))
                total_bruto = 0
                itens_payload = []

                for item in itens:
                    produto_id = item.get("produto_id")
                    qtd = parse_decimal(item.get("quantidade", 0))

                    if not produto_id or qtd <= 0:
                        return self.send_error_json(
                            "Todos os itens da venda precisam de produto e quantidade válidos."
                        )

                    produto = self.get_produto(produto_id)

                    if not produto:
                        return self.send_error_json(
                            f"Produto {produto_id} não encontrado.",
                            404
                        )

                    estoque_atual = parse_decimal(produto.get("estoque_atual", 0))

                    if estoque_atual < qtd:
                        return self.send_error_json(
                            f"Estoque insuficiente para {produto.get('nome', 'produto')}. "
                            f"Saldo atual: {estoque_atual}.",
                            409
                        )

                    preco = money(item.get("preco_unitario", produto.get("preco_venda", 0)))
                    custo = money(produto.get("custo_medio") or produto.get("preco_custo", 0))
                    subtotal = round(qtd * preco, 2)
                    total_bruto += subtotal

                    itens_payload.append({
                        "produto_id": produto_id,
                        "quantidade": qtd,
                        "preco_unitario": preco,
                        "custo_unitario": custo,
                        "subtotal": subtotal,
                    })

                total = max(round(total_bruto - desconto, 2), 0)
                imposto = round(total * 0.10, 2)

                venda_payload = {
                    "cliente_id": cliente_id,
                    "numero_pedido": data.get("numero_pedido") or None,
                    "status": "finalizada",
                    "desconto": desconto,
                    "total": total,
                    "imposto": imposto,
                }

                venda = supabase.table("vendas").insert(venda_payload).execute()
                venda_id = venda.data[0]["id"]

                conta_receber_payload = {
                    "entidade_id": cliente_id,
                    "descricao": f"Venda #{venda_id}",
                    "numero_documento": f"VENDA-{venda_id}",
                    "data_emissao": date.today().isoformat(),
                    "data_vencimento": self.normalizar_data_vencimento(data),
                    "valor_original": total,
                    "valor_recebido": 0,
                    "status": "ABERTO",
                    "forma_recebimento": data.get("forma_pagamento") or None,
                    "observacoes": f"Gerado automaticamente pela venda #{venda_id}.",
                    "estornado": False,
                }

                supabase.table("contas_receber").insert(conta_receber_payload).execute()

                for item in itens_payload:
                    item["venda_id"] = venda_id

                supabase.table("itens_venda").insert(itens_payload).execute()

                for item in itens_payload:
                    produto = self.get_produto(item["produto_id"])

                    estoque_anterior = parse_decimal(produto.get("estoque_atual", 0))
                    custo_anterior = money(
                        produto.get("custo_medio") or produto.get("preco_custo", 0)
                    )

                    qtd = parse_decimal(item.get("quantidade", 0))
                    estoque_novo = estoque_anterior - qtd

                    self.atualizar_produto_estoque(
                        item["produto_id"],
                        estoque_novo
                    )

                    self.registrar_movimentacao(
                        produto_id=item["produto_id"],
                        tipo="SAIDA",
                        origem="VENDA",
                        origem_id=venda_id,
                        quantidade=qtd,
                        saldo_anterior=estoque_anterior,
                        saldo_novo=estoque_novo,
                        custo_anterior=custo_anterior,
                        custo_novo=custo_anterior,
                        motivo=f"Venda #{venda_id}",
                        usuario_id=None,
                    )

                self.send_json({
                    "message": "Venda finalizada e estoque baixado com sucesso.",
                    "venda": venda.data[0]
                }, 201)


            elif path == "/api/usuarios/perfil":
                user_id = str(data.get("user_id") or "").strip()
                perfil_nome = str(data.get("perfil") or "").strip().upper()

                logger.info(f"[usuarios/perfil] BODY recebido: {data}")
                logger.info(f"[usuarios/perfil] user_id={user_id} perfil={perfil_nome}")

                if not user_id or not perfil_nome:
                    return self.send_error_json("User ID e perfil são obrigatórios.", 400)

                # Aqui precisa ser o ID UUID do Supabase Auth, não e-mail.
                if "@" in user_id:
                    return self.send_error_json(
                        "Use o ID do usuário do Supabase Auth, não o e-mail.",
                        400
                    )

                perfis_validos = ["ADMIN", "VENDEDOR", "FINANCEIRO", "ESTOQUE", "ESTOQUISTA"]

                if perfil_nome not in perfis_validos:
                    return self.send_error_json(
                        "Perfil inválido. Use ADMIN, VENDEDOR, FINANCEIRO ou ESTOQUE.",
                        400
                    )

                # Busca o perfil no banco.
                # Se o Supabase retornar 200 porém data vazia por causa de RLS,
                # usamos fallback pelos IDs que você mostrou na tabela.
                perfil_res = (
                    supabase.table("perfis_acesso")
                    .select("id,nome")
                    .eq("nome", perfil_nome)
                    .limit(1)
                    .execute()
                )

                logger.info(f"[usuarios/perfil] perfil_res.data={perfil_res.data}")

                perfil_id = None

                if perfil_res.data:
                    perfil_id = perfil_res.data[0].get("id")
                else:
                    perfil_id_fallback = {
                        "ADMIN": 1,
                        "VENDEDOR": 2,
                        "ESTOQUISTA": 3,
                        "FINANCEIRO": 4,
                        "ESTOQUE": 7,
                    }
                    perfil_id = perfil_id_fallback.get(perfil_nome)
                    logger.warning(
                        f"[usuarios/perfil] Perfil não veio pela API. "
                        f"Usando fallback perfil_id={perfil_id} para {perfil_nome}."
                    )

                if not perfil_id:
                    return self.send_error_json("Perfil não encontrado no banco.", 404)

                # Desativa vínculos antigos do usuário
                update_res = (
                    supabase.table("usuarios_perfis")
                    .update({"ativo": False})
                    .eq("user_id", user_id)
                    .execute()
                )

                logger.info(f"[usuarios/perfil] update_res.data={update_res.data}")

                # Cria novo vínculo ativo
                novo = (
                    supabase.table("usuarios_perfis")
                    .insert({
                        "user_id": user_id,
                        "perfil_id": perfil_id,
                        "ativo": True
                    })
                    .execute()
                )

                logger.info(f"[usuarios/perfil] insert_res.data={novo.data}")

                if not novo.data:
                    return self.send_error_json(
                        "O Supabase não retornou o vínculo criado. Verifique RLS/Policies da tabela usuarios_perfis.",
                        500
                    )

                self.send_json({
                    "message": "Perfil vinculado com sucesso.",
                    "usuario_perfil": novo.data[0]
                }, 201)

            else:
                self.send_error_json("Not found", 404)

        except Exception as e:
            logger.error(f"POST Error: {e}")

            if "duplicate key value" in str(e).lower() or "unique constraint" in str(e).lower():
                self.send_error_json("Registro duplicado detectado no banco de dados.", 409)
            else:
                self.send_error_json(f"Ocorreu um erro interno no servidor: {e}", 500)

    def do_PUT(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        user = self.require_auth()
        if not user:
            return

        if not self.require_permission(user, path, "PUT"):
            return

        data = self.read_json_body()

        try:
            if path.startswith("/api/produtos/"):
                pid = path.split("/")[-1]

                pc = parse_decimal(data.get("preco_custo", "0"))
                pv = parse_decimal(data.get("preco_venda", "0"))
                custo_medio = parse_decimal(data.get("custo_medio", pc))

                margem = ((pv - pc) / pc * 100) if pc > 0 else 0

                payload = {
                    "sku": data.get("sku", "").strip(),
                    "nome": data.get("nome", "").strip(),
                    "descricao": data.get("descricao") or None,
                    "unidade_medida": data.get("unidade_medida") or "UN",
                    "preco_custo": pc,
                    "custo_medio": custo_medio if custo_medio > 0 else pc,
                    "preco_venda": pv,
                    "margem_lucro": margem,
                    "estoque_atual": parse_decimal(data.get("estoque_atual", "0")),
                    "estoque_minimo": parse_decimal(data.get("estoque_minimo", "0")),
                }

                res = supabase.table("produtos").update(payload).eq("id", pid).execute()
                self.send_json(res.data[0] if res.data else {})

            elif path.startswith("/api/entidades/"):
                eid = path.split("/")[-1]

                payload = {
                    "tipo_entidade": data.get("tipo_entidade", "").strip(),
                    "nome_razao_social": data.get("nome_razao_social", "").strip(),
                    "nome_fantasia": data.get("nome_fantasia") or None,
                    "cpf_cnpj": data.get("cpf_cnpj", "").strip(),
                    "inscricao_estadual": data.get("inscricao_estadual") or None,
                    "email": data.get("email") or None,
                    "telefone": data.get("telefone") or None,
                    "cep": data.get("cep") or None,
                    "logradouro": data.get("logradouro") or None,
                    "numero": data.get("numero") or None,
                    "bairro": data.get("bairro") or None,
                    "cidade": data.get("cidade") or None,
                    "uf": data.get("uf") or None,
                }

                res = supabase.table("entidades").update(payload).eq("id", eid).execute()
                self.send_json(res.data[0] if res.data else {})

            elif path.startswith("/api/plano-contas/"):
                cid = path.split("/")[-1]
                cp_id = data.get("conta_pai_id")

                payload = {
                    "codigo": data.get("codigo", "").strip(),
                    "nome": data.get("nome", "").strip(),
                    "tipo_conta": data.get("tipo_conta", "").strip(),
                    "natureza": data.get("natureza", "").strip(),
                    "conta_pai_id": cp_id if cp_id not in [None, "", 0, "0"] else None,
                    "aceita_lancamento": bool(data.get("aceita_lancamento", True)),
                }

                res = supabase.table("plano_contas").update(payload).eq("id", cid).execute()
                self.send_json(res.data[0] if res.data else {})

            else:
                self.send_error_json("Not found", 404)

        except Exception as e:
            logger.error(f"PUT Error: {e}")

            if "duplicate key value" in str(e).lower() or "unique constraint" in str(e).lower():
                self.send_error_json(
                    "Alteração resultou em registro duplicado/conflito com cadastro já existente.",
                    409
                )
            else:
                self.send_error_json("Erro interno no servidor de edição.", 500)

    def do_PATCH(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        user = self.require_auth()
        if not user:
            return

        if not self.require_permission(user, path, "PATCH"):
            return

        try:
            if path.startswith("/api/produtos/") and path.endswith("/toggle"):
                pid = path.split("/")[-2]

                curr = (
                    supabase.table("produtos")
                    .select("ativo")
                    .eq("id", pid)
                    .execute()
                )

                if not curr.data:
                    return self.send_error_json("Not found", 404)

                new_ativo = not curr.data[0]["ativo"]

                res = (
                    supabase.table("produtos")
                    .update({"ativo": new_ativo})
                    .eq("id", pid)
                    .execute()
                )

                self.send_json(res.data[0])

            elif path.startswith("/api/entidades/") and path.endswith("/toggle"):
                eid = path.split("/")[-2]

                curr = (
                    supabase.table("entidades")
                    .select("ativo")
                    .eq("id", eid)
                    .execute()
                )

                if not curr.data:
                    return self.send_error_json("Not found", 404)

                new_ativo = not curr.data[0]["ativo"]

                res = (
                    supabase.table("entidades")
                    .update({"ativo": new_ativo})
                    .eq("id", eid)
                    .execute()
                )

                self.send_json(res.data[0])

            elif path.startswith("/api/plano-contas/") and path.endswith("/toggle"):
                cid = path.split("/")[-2]

                curr = (
                    supabase.table("plano_contas")
                    .select("ativo")
                    .eq("id", cid)
                    .execute()
                )

                if not curr.data:
                    return self.send_error_json("Not found", 404)

                new_ativo = not curr.data[0]["ativo"]

                res = (
                    supabase.table("plano_contas")
                    .update({"ativo": new_ativo})
                    .eq("id", cid)
                    .execute()
                )

                self.send_json(res.data[0])

            else:
                self.send_error_json("Not found", 404)

        except Exception as e:
            logger.error(f"PATCH Error: {e}")
            self.send_error_json(str(e), 500)


def run_server(port=8080):
    server_address = ("", port)
    httpd = HTTPServer(server_address, BackendHandler)
    url = f"http://localhost:{port}"

    logger.info(f"Servidor rodando! Acesse: {url}")
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

    httpd.server_close()
    logger.info("Servidor parado.")


if __name__ == "__main__":
    run_server()