import json
import logging
import mimetypes
import os
import urllib.parse
import threading
import webbrowser

from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from decimal import InvalidOperation, Decimal
from app.config import supabase

# Configuração de Registros (Logs)
# Motivo: Ajuda o desenvolvedor a ver o que está acontecendo no terminal enquanto o servidor roda.
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)

# Mapeando onde fica a pasta do Frontend
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

def parse_decimal(value: str, default: str = "0") -> float:
    # Converte valor monetário em texto para float.
    # Aceita formato brasileiro e retorna o padrão numérico.
    raw = (value or "").strip().replace(".", "").replace(",", ".")
    if not raw:
        raw = default
    try:
        return float(Decimal(raw))
    except InvalidOperation:
        return float(default)

class BackendHandler(BaseHTTPRequestHandler):
    # Classe que processa as requisições HTTP do servidor.
    # Define se a resposta será uma página HTML ou uma ação da API.
    
    def send_json(self, data, status=200, headers=None):
        # Envia respostas em JSON para o frontend.
        # Usada pelos métodos de requisição do servidor.
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_json(self, message, status=400):
        # Devolve uma mensagem de erro formatada para o Frontend exibir no alerta vermelho.
        self.send_json({"error": message}, status)

    def serve_static(self, url_path):
        # Lê arquivos estáticos do frontend e envia para o navegador.
        if url_path == "/pages/login":
            file_path = FRONTEND_DIR / "pages" / "login.html"
        elif url_path == "/pages/dashboard":
            file_path = FRONTEND_DIR / "pages" / "dashboard.html"
        elif url_path == "/pages/entidades":
            file_path = FRONTEND_DIR / "pages" / "entidades.html"
        elif url_path == "/pages/produtos":
            file_path = FRONTEND_DIR / "pages" / "produtos.html"
        elif url_path == "/pages/plano-contas":
            file_path = FRONTEND_DIR / "pages" / "plano_contas.html"
        else:
            # Para arquivos CSS e JS que são chamados diretamente pelas tags <link> e <script>
            file_path = FRONTEND_DIR / url_path.lstrip("/")

        # Validação: Se o arquivo não existir, retorna Erro 404
        if not file_path.exists() or not file_path.is_file():
            self.send_error_json("Not found", 404)
            return

        # Descobre o MimeType (para dizer ao navegador se é um arquivo de texto, estilo, script ou imagem)
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "application/octet-stream"

        if file_path.suffix == ".html":
            mime_type = "text/html; charset=utf-8"

        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.end_headers()
        with open(file_path, 'rb') as f:
            self.wfile.write(f.read())

    def get_token_from_cookie(self):
        # Obtém do cookie o token de acesso da sessão.
        cookies = self.headers.get('Cookie')
        if not cookies:
            return None
        for cookie in cookies.split(';'):
            cookie = cookie.strip()
            if cookie.startswith('sb_access_token='):
                return cookie.split('=')[1]
        return None

    def require_auth(self):
        # Valida a sessão do usuário e bloqueia acesso não autorizado.
        token = self.get_token_from_cookie()
        if not token:
            self.send_error_json("Unauthorized", 401)
            return None
        try:
            # Vai até o Auth do Supabase e valida matematicamente se o cookie é real e não expirou
            user = supabase.auth.get_user(token)
            if not user:
                self.send_error_json("Unauthorized", 401)
                return None
            return user.user # Se chegou aqui, o usuário existe de verdade e tem permissão!
        except Exception as e:
            logger.error(f"Auth error: {e}")
            self.send_error_json("Unauthorized", 401)
            return None
            
    def do_GET(self):
        # Processa requisições GET para páginas e dados da API.
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        # Redirecionamentos básicos de navegação
        if path == "/":
            self.send_response(302)
            self.send_header('Location', '/pages/login')
            self.end_headers()
            return
            
        if path == "/logout":
            self.send_response(302)
            self.send_header('Location', '/pages/login')
            # Limpa o cookie de controle matando o acesso (data de expiração no passado)
            self.send_header('Set-Cookie', 'sb_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
            self.end_headers()
            return

        # Ajuste "Clean URL" (Tira as marcações feias de /pages da URL da barra de endereços)
        if path in ["/login", "/dashboard", "/entidades", "/produtos", "/plano-contas"]:
            self.send_response(302)
            self.send_header('Location', f'/pages{path}' if path == "/login" else f'/pages/{path.lstrip("/")}')
            self.end_headers()
            return

        # Roteador de Decisão. (É arquivo estático ou é dado da API?)
        if not path.startswith("/api/"):
            # Se não começa com /api/, significa que ele quer baixar tela, estilo ou script.
            return self.serve_static(path)

        # ROTA: Verifica quem sou eu? (Usado no topo do dashboard para carregar o e-mail logado)
        if path == "/api/me":
            token = self.get_token_from_cookie()
            try:
                user = supabase.auth.get_user(token) if token else None
                if user and user.user:
                    u = user.user
                    self.send_json({
                        "authenticated": True,
                        "user": {"id": u.id, "email": u.email, "nome": u.user_metadata.get("nome", "Usuário") if u.user_metadata else "Usuário"}
                    })
                else:
                    self.send_json({"authenticated": False}, 401)
            except:
                self.send_json({"authenticated": False}, 401)
            return

        # Segurança Ativa - TUDO DAQUI PARA BAIXO EXIGE ESTAR LOGADO
        user = self.require_auth()
        if not user:
            return

        try:
            # APIs de Busca e Listagem de Registros
            if path == "/api/produtos":
                # Consulta: Faz um SELECT * FROM produtos ORDER BY id DESC; via Supabase
                res = supabase.table('produtos').select('*').order('id', desc=True).execute()
                self.send_json(res.data) # Resposta enviada ao Frontend
                
            elif path == "/api/entidades":
                res = supabase.table('entidades').select('*').order('id', desc=True).execute()
                self.send_json(res.data)
                
            elif path == "/api/plano-contas":
                # Consulta: Traz as contas e faz "Join" automático com a conta Pai dela!
                res = supabase.table('plano_contas').select('*, conta_pai:conta_pai_id(*)').order('codigo').execute()
                self.send_json(res.data)
            else:
                self.send_error_json("Not found", 404)
        except Exception as e:
            logger.error(f"GET Error: {e}")
            self.send_error_json(str(e), 500)

    def do_POST(self):
        # Processa requisições POST para criar novos dados.
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        # Lendo o "Body" da Requisição (aquilo que o navegador mandou para o servidor salvar)
        content_length_header = self.headers.get('Content-Length')
        content_length = int(content_length_header) if content_length_header else 0
        raw_body = self.rfile.read(content_length)
        try:
            data = json.loads(raw_body.decode('utf-8')) if raw_body else {}
        except:
            data = {}

        # ROTA EXCEÇÃO DE SEGURANÇA: Login. Qualquer um pode chamar a rota de login.
        if path == "/api/login":
            email = data.get("email", "").strip()
            password = data.get("password", "")
            if not email or not password:
                return self.send_error_json("E-mail e senha são obrigatórios.")
            
            try:
                # Dispara a verificação para dentro do motor do Supabase Auth
                auth_res = supabase.auth.sign_in_with_password({"email": email, "password": password})
                token = auth_res.session.access_token
                user = auth_res.user

                # Cria o cookie invisível (Sessão) que vai ficar guardado no navegador protegendo a entrada do usuário
                cookie = f"sb_access_token={token}; Path=/; HttpOnly; SameSite=Lax"
                
                self.send_json({
                    "message": "Login realizado com sucesso.",
                    "user": {"id": user.id, "email": user.email, "nome": user.user_metadata.get("nome", "Usuário") if user.user_metadata else "Usuário"}
                }, headers={"Set-Cookie": cookie})
            except Exception as e:
                self.send_error_json(f"Falha de autenticação: Conta não encontrada ou senha inválida.", 401)
            return

        # Segurança Ativa - TUDO DAQUI PARA BAIXO EXIGE ESTAR LOGADO
        user = self.require_auth()
        if not user:
            return

        try:
            # Recebeu dados de novo Produto
            if path == "/api/produtos":
                sku = data.get("sku", "").strip()
                nome = data.get("nome", "").strip()
                
                # Validação Obrigatória
                if not sku or not nome:
                    return self.send_error_json("SKU e Nome são obrigatórios.")
                
                # Regra de Negócio: Cálculo automático de Margem de Lucro antes mesmo de ir pro banco
                pc = parse_decimal(str(data.get("preco_custo", "0")))
                pv = parse_decimal(str(data.get("preco_venda", "0")))
                margem = ((pv - pc) / pc * 100) if pc > 0 else 0
                
                # Monta a "caixa" (Payload) com os dados higienizados para o Banco de Dados
                payload = {
                    "sku": sku,
                    "nome": nome,
                    "descricao": data.get("descricao") or None,
                    "unidade_medida": data.get("unidade_medida") or "UN",
                    "preco_custo": pc,
                    "preco_venda": pv,
                    "margem_lucro": margem,
                    "estoque_atual": parse_decimal(str(data.get("estoque_atual", "0"))),
                    "estoque_minimo": parse_decimal(str(data.get("estoque_minimo", "0"))),
                    "ativo": True
                }

                # Prevenção de Duplicidade (O SKU precisa ser único como código de barras na loja)
                exist = supabase.table('produtos').select('id').eq('sku', sku).execute()
                if exist.data:
                    return self.send_error_json("Já existe um produto com esse SKU cadastrado.", 409)

                # Salva (INSERT) e envia de volta ao Javascript um código HTTP 201 (Created)
                res = supabase.table('produtos').insert(payload).execute()
                self.send_json(res.data[0], 201)

            # Idêntico fluxo, mas voltado para Entidades (Clientes/Fornecedores)
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
                    "ativo": True
                }
                
                # Prevenção de Duplicidade no CNPJ/CPF
                exist = supabase.table('entidades').select('id').eq('cpf_cnpj', cpf_cnpj).execute()
                if exist.data:
                    return self.send_error_json("Já existe um cadastro com esse CPF/CNPJ.", 409)

                res = supabase.table('entidades').insert(payload).execute()
                self.send_json(res.data[0], 201)

            # Fluxo de Plano de Contas
            elif path == "/api/plano-contas":
                codigo = data.get("codigo", "").strip()
                if not codigo or not data.get("nome"):
                    return self.send_error_json("Código e Nome são obrigatórios.")
                
                # Regra: Se escolher uma conta pai que está vazia no layout, manda pro banco como Nula.
                cp_id = data.get("conta_pai_id")
                payload = {
                    "codigo": codigo,
                    "nome": data.get("nome", "").strip(),
                    "tipo_conta": data.get("tipo_conta", "").strip(),
                    "natureza": data.get("natureza", "").strip(),
                    "conta_pai_id": cp_id if cp_id not in [None, "", 0, "0"] else None,
                    "aceita_lancamento": bool(data.get("aceita_lancamento", True)),
                    "ativo": True
                }
                
                exist = supabase.table('plano_contas').select('id').eq('codigo', codigo).execute()
                if exist.data:
                    return self.send_error_json("Já existe uma conta com esse código.", 409)

                res = supabase.table('plano_contas').insert(payload).execute()
                self.send_json(res.data[0], 201)

            else:
                self.send_error_json("Not found", 404)
        except Exception as e:
            logger.error(f"POST Error: {e}")
            if "duplicate key value" in str(e).lower() or "unique constraint" in str(e).lower():
                self.send_error_json("Registro duplicado detectado no banco de dados.", 409)
            else:
                self.send_error_json("Ocorreu um erro interno no servidor.", 500)

    def do_PUT(self):
        # Processa requisições PUT para atualizar dados existentes.
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        user = self.require_auth()
        if not user:
            return

        content_length_header = self.headers.get('Content-Length')
        raw_body = self.rfile.read(int(content_length_header)) if content_length_header else b""
        try:
            data = json.loads(raw_body.decode('utf-8'))
        except:
            data = {}

        try:
            # Captura na ROTA o ID final (ex: /api/produtos/2)
            if path.startswith("/api/produtos/"):
                pid = path.split("/")[-1] # Transforma numa lista e pega o último valor do link (no caso, 2)
                
                pc = parse_decimal(str(data.get("preco_custo", "0")))
                pv = parse_decimal(str(data.get("preco_venda", "0")))
                margem = ((pv - pc) / pc * 100) if pc > 0 else 0
                
                payload = {
                    "sku": data.get("sku", "").strip(),
                    "nome": data.get("nome", "").strip(),
                    "descricao": data.get("descricao") or None,
                    "unidade_medida": data.get("unidade_medida") or "UN",
                    "preco_custo": pc,
                    "preco_venda": pv,
                    "margem_lucro": margem,
                    "estoque_atual": parse_decimal(str(data.get("estoque_atual", "0"))),
                    "estoque_minimo": parse_decimal(str(data.get("estoque_minimo", "0")))
                }
                # Executa o Update limitando usando a regra `.eq('id', pid)`, para não atualizar o banco todo rs!
                res = supabase.table('produtos').update(payload).eq('id', pid).execute()
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
                    "uf": data.get("uf") or None
                }
                res = supabase.table('entidades').update(payload).eq('id', eid).execute()
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
                    "aceita_lancamento": bool(data.get("aceita_lancamento", True))
                }
                res = supabase.table('plano_contas').update(payload).eq('id', cid).execute()
                self.send_json(res.data[0] if res.data else {})
                
            else:
                self.send_error_json("Not found", 404)
        except Exception as e:
            logger.error(f"PUT Error: {e}")
            if "duplicate key value" in str(e).lower() or "unique constraint" in str(e).lower():
                self.send_error_json("Alteração resultou em registro duplicado/conflito com cadastro já existente.", 409)
            else:
                self.send_error_json("Erro interno no servidor de edição.", 500)

    def do_PATCH(self):
        # Processa requisições PATCH para alterar campos específicos.
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        user = self.require_auth()
        if not user:
            return

        try:
            # Rota clássica capturada: "/api/produtos/2/toggle"
            if path.startswith("/api/produtos/") and path.endswith("/toggle"):
                pid = path.split("/")[-2] # Pega o penúltimo valor (o 2)
                
                # Regra de Lógica Booleana: Consulta o banco para saber se tá ativo (True). Se sim, converte pra Inativo (False).
                curr = supabase.table('produtos').select('ativo').eq('id', pid).execute()
                if not curr.data:
                    return self.send_error_json("Not found", 404)
                new_ativo = not curr.data[0]['ativo'] 
                
                # Acerta silenciosamente o status no Banco de Dados.
                res = supabase.table('produtos').update({'ativo': new_ativo}).eq('id', pid).execute()
                self.send_json(res.data[0])

            elif path.startswith("/api/entidades/") and path.endswith("/toggle"):
                eid = path.split("/")[-2]
                curr = supabase.table('entidades').select('ativo').eq('id', eid).execute()
                if not curr.data:
                    return self.send_error_json("Not found", 404)
                new_ativo = not curr.data[0]['ativo']
                res = supabase.table('entidades').update({'ativo': new_ativo}).eq('id', eid).execute()
                self.send_json(res.data[0])

            elif path.startswith("/api/plano-contas/") and path.endswith("/toggle"):
                cid = path.split("/")[-2]
                curr = supabase.table('plano_contas').select('ativo').eq('id', cid).execute()
                if not curr.data:
                    return self.send_error_json("Not found", 404)
                new_ativo = not curr.data[0]['ativo']
                res = supabase.table('plano_contas').update({'ativo': new_ativo}).eq('id', cid).execute()
                self.send_json(res.data[0])
            else:
                self.send_error_json("Not found", 404)
        except Exception as e:
            logger.error(f"PATCH Error: {e}")
            self.send_error_json(str(e), 500)

def run_server(port=8080):
    # Inicia o servidor e o mantém em execução.
    server_address = ('', port)
    httpd = HTTPServer(server_address, BackendHandler)
    
    url = f"http://localhost:{port}"
    logger.info(f"Servidor rodando! Acesse: {url}")

    # Inteligência Artifical Pura: Abre a janelinha do seu Chrome automaticamente depois de exatos 1 segundo!
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    
    try:
        httpd.serve_forever() # Só é interrompido pelo CTRL+C no terminal
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    logger.info("Servidor parado.")

# Opcionalmente, pode ser executado diretamente por este arquivo também.
if __name__ == "__main__":
    run_server()
